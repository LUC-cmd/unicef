package tg.fildor.service;

import org.springframework.stereotype.Service;
import tg.fildor.config.AppUser;
import tg.fildor.repo.JournalRepository;

@Service
public class AccesService {

    private final JournalRepository journal;

    public AccesService(JournalRepository journal) {
        this.journal = journal;
    }

    public void tracer(AppUser u, String action, String ressource) {
        journal.ajouter(u.getUsername(), action, ressource);
    }
}
