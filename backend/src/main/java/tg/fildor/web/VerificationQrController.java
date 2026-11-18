package tg.fildor.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tg.fildor.service.CarnetQrService;

/** Page « Vérifier un QR » : un centre, une mairie ou un agent scanne (ou colle) le code du carnet
 *  papier et lit l'état du suivi, où qu'il soit. Authentifié, mais sans contrainte de zone :
 *  le jeton est autosuffisant et sa signature garantit qu'il vient de Fil d'Or. */
@RestController
@RequestMapping("/api/verification")
public class VerificationQrController {

    private final CarnetQrService qr;

    public VerificationQrController(CarnetQrService qr) {
        this.qr = qr;
    }

    public record JetonRecu(String jeton) {
    }

    @PostMapping("/carnet-qr")
    CarnetQrService.Verification verifier(@RequestBody JetonRecu req) {
        return qr.verifier(req.jeton());
    }
}
