package tg.fildor.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tg.fildor.config.AppUser;
import tg.fildor.config.FilDorProperties;
import tg.fildor.domain.Dtos.DeclarationDto;
import tg.fildor.repo.DeclarationRepository;
import tg.fildor.repo.DeclarationRepository.ContexteFamille;
import tg.fildor.repo.MessageRepository;
import tg.fildor.repo.SuiviRepository.EnfantRef;

/**
 * Déclaration de naissance lancée par l'agent ou l'accoucheuse, validée à distance par la mairie.
 * Gratuite dans les 45 jours (depuis le 01/01/2022) ; au-delà : jugement supplétif à 6 000 FCFA.
 * Le reçu horodaté est une preuve d'envoi : sa valeur légale reste à confirmer avec l'état civil.
 */
@Service
public class NaissanceService {

    public static final int DELAI_GRATUIT_JOURS = 45;

    public record Resultat(boolean creee, DeclarationDto declaration) {
    }

    /**
     * Ce que la famille accepte de communiquer à l'état civil. Un nom n'est gardé que si la personne concernée a donné
     * son accord ; sans accord, rien n'est conservé.
     */
    public record Identite(String mereNom, String pereNom, String enfantPrenom, boolean accordMere, boolean accordPere) {
        private static String net(String s, boolean accord) {
            if (!accord || s == null) {
                return null;
            }
            String t = s.strip();
            if (t.isEmpty()) {
                return null;
            }
            return t.length() > 120 ? t.substring(0, 120) : t;
        }

        public Identite nettoyee() {
            return new Identite(net(mereNom, accordMere), net(pereNom, accordPere),
                    net(enfantPrenom, accordMere || accordPere), accordMere, accordPere);
        }
    }

    private final DeclarationRepository declarations;
    private final SuiviService suivi;
    private final AccesService acces;
    private final MessageRepository messages;
    private final tg.fildor.repo.NationaliteRepository nationalite;
    private final String secretPreuve;

    public NaissanceService(DeclarationRepository declarations, SuiviService suivi, AccesService acces,
                            MessageRepository messages, tg.fildor.repo.NationaliteRepository nationalite,
                            FilDorProperties props) {
        this.nationalite = nationalite;
        this.declarations = declarations;
        this.suivi = suivi;
        this.acces = acces;
        this.messages = messages;
        this.secretPreuve = props.telephonePepper() + "|preuve";
    }

    private static final String ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    /** Résultat public d'une vérification : jamais de nom, jamais d'adresse. */
    public record Preuve(String numero, String statut, boolean verifiee, String zone, String naissance,
                         LocalDate valideeLe, String message) {
    }

    /**
     * Code de vérification de 6 caractères, calculé à partir du numéro de reçu et d'un secret du serveur :
     * rien de plus à stocker, et impossible à deviner sans le secret.
     */
    public String codePreuve(String numeroRecu) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretPreuve.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = mac.doFinal(numeroRecu.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(ALPHABET.charAt(h[i] & 31));
            }
            return sb.toString();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String texteStatut(String statut) {
        return switch (statut) {
            case "VALIDEE" -> "La mairie a enregistré cette déclaration. Ce n'est pas l'acte de naissance.";
            case "REJETEE" -> "La mairie attend une correction : demandez à l'agent de santé.";
            default -> "La déclaration est arrivée à la mairie, elle n'est pas encore traitée.";
        };
    }

    /** Vérification publique. Sans le bon code, seul l'état de la déclaration est visible. */
    public Preuve verifier(String numero, String code) {
        String n = numero == null ? "" : numero.strip().toUpperCase();
        var trouvee = declarations.parNumero(n);
        if (trouvee.isEmpty()) {
            return new Preuve(n, "INCONNUE", false, null, null, null, null);
        }
        DeclarationDto d = trouvee.get();
        String saisi = code == null ? "" : code.strip().toUpperCase();
        boolean ok = !saisi.isEmpty() && MessageDigest.isEqual(saisi.getBytes(StandardCharsets.UTF_8),
                codePreuve(d.numeroRecu()).getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            return new Preuve(d.numeroRecu(), d.statut(), false, null, null, null, texteStatut(d.statut()));
        }
        LocalDate validee = "VALIDEE".equals(d.statut()) ? declarations.dateTraitement(d.id()).orElse(null) : null;
        String naissance = d.dateNaissance() == null ? null : d.dateNaissance().toString().substring(0, 7);
        return new Preuve(d.numeroRecu(), d.statut(), true, d.zone(), naissance, validee, texteStatut(d.statut()));
    }

    /** La mairie relit le numéro et le code d'une déclaration validée, pour les donner à la famille. */
    public Map<String, String> preuveMairie(AppUser u, long id) {
        DeclarationDto d = declarations.parId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Déclaration introuvable"));
        if (!"VALIDEE".equals(d.statut())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seule une déclaration validée a une preuve");
        }
        acces.tracer(u, "VOIR_PREUVE", String.valueOf(id));
        return Map.of("numero", d.numeroRecu(), "code", codePreuve(d.numeroRecu()));
    }

    // Pas de @Transactional ici : appelée dans la synchronisation, une exception rattrapée marquerait sinon
    // toute la transaction de synchronisation comme à annuler. L'insertion est atomique à elle seule.
    public Resultat declarer(AppUser u, String codeEnfant, String lieu, boolean certificat, LocalDate aujourdhui) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        if (!"ENFANT".equals(e.statut()) || e.dateNaissance() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cet enfant n'est pas encore né");
        }
        if (e.dateNaissance().isAfter(aujourdhui)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date de naissance dans le futur");
        }
        boolean dansDelai = ChronoUnit.DAYS.between(e.dateNaissance(), aujourdhui) <= DELAI_GRATUIT_JOURS;
        String recu = "FDO-" + aujourdhui.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + String.format("%06d", e.id());
        boolean creee = declarations.creer(e.id(), lieu, certificat, recu, dansDelai);
        acces.tracer(u, creee ? "DECLARER_NAISSANCE" : "DECLARATION_DEJA_ENVOYEE", codeEnfant);
        DeclarationDto d = declarations.parEnfant(e.id()).orElseThrow();
        return new Resultat(creee, d);
    }

    /** Déclaration avec sa provenance et, si la famille l'a choisi, les informations pour l'acte. */
    public Resultat declarer(AppUser u, String codeEnfant, String lieu, boolean certificat, Identite identite,
                             String source, LocalDate aujourdhui) {
        Resultat r = declarer(u, codeEnfant, lieu, certificat, aujourdhui);
        if (r.creee()) {
            String src = source == null || source.isBlank() ? "AGENT" : source;
            declarations.definirSource(r.declaration().id(), src);
            if (identite != null) {
                Identite p = identite.nettoyee();
                declarations.enregistrerIdentite(r.declaration().id(), p.mereNom(), p.pereNom(), p.enfantPrenom(),
                        p.accordMere(), p.accordPere(), src, u.id());
            }
        }
        return r;
    }

    /** Le nom de l'enfant se donne à partir du 8e jour ; il complète la déclaration déjà envoyée à l'état civil. */
    public java.util.Map<String, Object> donnerPrenom(AppUser u, String codeEnfant, String prenom, LocalDate aujourdhui) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        if (!"ENFANT".equals(e.statut()) || e.dateNaissance() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cet enfant n'est pas encore né");
        }
        if (declarations.parEnfant(e.id()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lancez d'abord la déclaration de naissance");
        }
        LocalDate attendu = e.dateNaissance().plusDays(8);
        if (aujourdhui.isBefore(attendu)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le nom se donne à partir du 8e jour, le " + attendu.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }
        String net = prenom == null ? "" : prenom.strip();
        if (net.length() < 2 || net.length() > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indiquez le prénom de l'enfant (2 à 60 lettres)");
        }
        declarations.definirPrenom(e.id(), net);
        acces.tracer(u, "DONNER_PRENOM", codeEnfant);
        return java.util.Map.of("prenom", net, "message", "Le nom de l'enfant est envoyé à l'état civil");
    }

    /** Pour la synchronisation : un nom déjà enregistré n'est pas remplacé, rejouer un envoi ne change rien. */
    @Transactional
    public boolean donnerPrenomUneFois(AppUser u, String codeEnfant, String prenom, LocalDate aujourdhui) {
        EnfantRef e = suivi.enfantAutorise(u, codeEnfant);
        if (declarations.prenom(e.id()).isPresent()) {
            return false;
        }
        donnerPrenom(u, codeEnfant, prenom, aujourdhui);
        return true;
    }

    public java.util.List<DeclarationRepository.DossierMairie> dossiers(AppUser u, String statut) {
        acces.tracer(u, "LISTER_DECLARATIONS", statut == null ? "toutes" : statut);
        return declarations.dossiers(statut);
    }

    public java.util.List<DeclarationDto> lister(AppUser u, String statut) {
        acces.tracer(u, "LISTER_DECLARATIONS", statut == null ? "toutes" : statut);
        return declarations.lister(statut);
    }

    @Transactional
    public String valider(AppUser u, long id) {
        if (!declarations.traiter(id, "VALIDEE", u.id(), null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Déclaration introuvable ou déjà traitée");
        }
        nationalite.ouvrir(id);
        acces.tracer(u, "VALIDER_DECLARATION", String.valueOf(id));
        return prevenir(id, true, null);
    }

    public java.util.List<tg.fildor.repo.NationaliteRepository.Dossier> dossiersNationalite(AppUser u) {
        acces.tracer(u, "LISTER_NATIONALITE", "tous");
        return nationalite.lister();
    }

    private static final java.util.Set<String> VOIES = java.util.Set.of("FILIATION", "SANS_PAPIERS", "PARENTS_ETRANGERS", "A_PRECISER");

    @Transactional
    public void avancerNationalite(AppUser u, long declarationId, int etape, String piecesOk, String voie, String note) {
        if (etape < 1 || etape > 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Étape inconnue");
        }
        if (voie != null && !VOIES.contains(voie)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voie inconnue");
        }
        String pieces = piecesOk == null ? "" : piecesOk.replaceAll("[^A-Z_,]", "");
        String n = note == null || note.isBlank() ? null : (note.strip().length() > 300 ? note.strip().substring(0, 300) : note.strip());
        if (!nationalite.avancer(declarationId, etape, pieces, voie, n, u.id())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable");
        }
        acces.tracer(u, "AVANCER_NATIONALITE", declarationId + ":" + etape);
    }

    @Transactional
    public String rejeter(AppUser u, long id, String motif) {
        if (motif == null || motif.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un motif de rejet est obligatoire");
        }
        String motifNet = motif.strip();
        if (!declarations.traiter(id, "REJETEE", u.id(), motifNet)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Déclaration introuvable ou déjà traitée");
        }
        acces.tracer(u, "REJETER_DECLARATION", String.valueOf(id));
        return prevenir(id, false, motifNet);
    }

    /** SMS simulé vers le téléphone de la famille. Sans téléphone, l'agent voit le résultat sur la fiche. */
    private String prevenir(long id, boolean validee, String motif) {
        ContexteFamille c = declarations.contexte(id).orElse(null);
        String preuve = "";
        if (validee) {
            preuve = declarations.parId(id)
                    .map(d -> "Reçu " + d.numeroRecu() + ", code " + codePreuve(d.numeroRecu()) + ".")
                    .orElse("");
        }
        if (c == null || !c.consentement() || !c.aTelephone()) {
            return validee
                    ? "Déclaration validée. Pas de téléphone : l'agent verra le résultat sur la fiche. " + preuve
                    : "Déclaration rejetée. Pas de téléphone : l'agent verra le motif sur la fiche.";
        }
        String texte = validee
                ? "Fil d'Or : la mairie a enregistré la naissance de l'enfant " + c.codeEnfant() + ". " + preuve
                        + " Gardez ce SMS. Ce n'est pas encore l'acte de naissance."
                : "Fil d'Or : la mairie n'a pas validé la déclaration de l'enfant " + c.codeEnfant()
                        + ". Motif : " + motif + ". L'agent de santé vous aidera à corriger.";
        messages.ajouterPourFamille(c.familleId(), "NAISSANCE", texte);
        return validee
                ? "Déclaration validée. Un SMS part vers la famille. " + preuve
                : "Déclaration rejetée. Un SMS part vers la famille.";
    }
}
