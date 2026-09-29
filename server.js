const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'donnees.json');

// Fonction pour lire les donnees sauvegardees
function lireDonnees() {
    if (!fs.existsSync(DATA_FILE)) {
        return { incidents: [] };
    }
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content || '{"incidents":[]}');
    } catch (e) {
        return { incidents: [] };
    }
}

// Fonction pour sauvegarder les donnees
function sauvegarderDonnees(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Route de test d'etat (Healthcheck)
app.get('/api/health', (req, res) => {
    res.json({ status: "OK", message: "Serveur PowerA operationnel" });
});

// API 1 : Calculateur de consommation (CIE)
app.post('/api/calcul-energie', (req, res) => {
    const { puissanceKw, heuresParJour, tarifKwh } = req.body;
    if (!puissanceKw || !heuresParJour) {
        return res.status(400).json({ error: "Champs puissance et heures requis." });
    }
    const tarif = tarifKwh ? parseFloat(tarifKwh) : 85; // Tarif moyen 85 FCFA / kWh
    const kwhMois = parseFloat(puissanceKw) * parseFloat(heuresParJour) * 30;
    const coutMoisFCFA = Math.round(kwhMois * tarif);

    res.json({
        kwhMois: kwhMois.toFixed(2),
        coutMoisFCFA: coutMoisFCFA.toLocaleString('fr-FR')
    });
});

// API 2 : Enregistrer une panne / incident
app.post('/api/incidents', (req, res) => {
    const { equipement, cause, dureeMinutes, coutHeureArret } = req.body;
    if (!equipement || !dureeMinutes) {
        return res.status(400).json({ error: "Nom d'equipement et duree requis." });
    }

    const data = lireDonnees();
    const tarifArret = coutHeureArret ? parseFloat(coutHeureArret) : 50000; // 50 000 FCFA/h par defaut
    const perteFCFA = Math.round((parseFloat(dureeMinutes) / 60) * tarifArret);

    const nouvelIncident = {
        id: data.incidents.length + 1,
        equipement,
        cause: cause || "Coupure / Baisse de tension CIE",
        dureeMinutes: parseFloat(dureeMinutes),
        perteFCFA,
        date: new Date().toLocaleString('fr-FR')
    };

    data.incidents.push(nouvelIncident);
    sauvegarderDonnees(data);

    res.json({ message: "Arret enregistre et sauvegarde avec succes !", incident: nouvelIncident });
});

// API 3 : Rapport global des pertes
app.get('/api/incidents', (req, res) => {
    const data = lireDonnees();
    const totalPertes = data.incidents.reduce((acc, curr) => acc + curr.perteFCFA, 0);
    const totalMinutes = data.incidents.reduce((acc, curr) => acc + curr.dureeMinutes, 0);

    res.json({
        totalIncidents: data.incidents.length,
        totalHeuresArret: (totalMinutes / 60).toFixed(1),
        totalPertesFCFA: totalPertes.toLocaleString('fr-FR'),
        liste: data.incidents
    });
});

app.listen(PORT, () => {
    console.log(`=== Serveur PowerA demarre sur http://localhost:${PORT} ===`);
});
