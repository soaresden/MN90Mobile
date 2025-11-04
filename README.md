# 🤿 MN90Mobile - Planificateur de Plongée

**Outil web interactif et responsive pour planifier vos plongées selon les tables MN90**

> Un calculateur professionnel de décompression pour la plongée récréative (N2/N3) directement dans votre poche.

---

## 📋 Caractéristiques

✅ **Planification complète**
- Calcul automatique des paliers à 6m
- Détermination du GPS (Groupe de Plongée Successive)
- Support des plongées successives avec intervalle de surface
- Calcul des majorations en fonction de l'azote résiduel

✅ **Interface intuitive**
- Design responsive adapté aux mobiles et tablettes
- Animations sous-marines immersives (bulles, plongeurs, poissons)
- Sections repliables pour une meilleure organisation
- Thème bleu océan avec gradients cyan

✅ **Visualisation graphique**
- Profil de plongée en temps réel
- Affichage simultané des 2 plongées (mode successive)
- Zone de danger visuelle (>40m)
- Graphique Chart.js haute qualité

✅ **Alertes de sécurité**
- Affichage en direct des risques
- Footer permanent avec alertes toujours visibles
- Codes couleur (✅ vert, ⚠️ orange, 🔴 rouge)
- Conseils de sécurité intégrés

✅ **Tables MN90 complètes**
- Table 1 : Paliers à 6m (minutes)
- Table 2 : Groupe de Plongée Successive (GPS)
- Table 3 : Azote Résiduel
- Table 4 : Majorations (minutes)
- Codes couleur pour les lettres GPS (du vert au noir)

✅ **Raccourcis de navigation**
- Menu rapide flottant pour passer entre les onglets
- Bouton direct vers les alertes
- Pas de scroll nécessaire pour l'essentiel

---

## 🚀 Démarrage Rapide

### Utilisation en ligne
Simplement ouvrir le fichier `MN90Mobile.html` dans votre navigateur (Chrome, Firefox, Safari, Edge recommandés).

```bash
# Aucune installation requise !
# Juste double-cliquez sur MN90Mobile.html
```

### Déploiement (optionnel)
```bash
# Cloner le repo
git clone https://github.com/SOARES-Denis/MN90Mobile.git
cd MN90Mobile

# Serveur local (Python)
python -m http.server 8000
# Puis visiter: http://localhost:8000/MN90Mobile.html

# Serveur local (Node)
npx http-server
```

---

## 📖 Mode d'emploi

### Plongée simple
1. Ajustez **Profondeur** et **Durée** avec les curseurs ou boutons +/-
2. Consultez les résultats :
   - Palier à 6m
   - GPS (Groupe de Plongée Successive)
   - Durée totale de remontée

### Plongée successive
1. ✅ Cochez "Plongée successive ?"
2. Définissez l'**intervalle de surface** (min 15 min)
3. Consultez l'**azote résiduel**
4. Entrez les paramètres de **Plongée 2**
5. Vérifiez la **majoration** et le nouveau **GPS**
6. Visualisez le **profil combiné** dans l'onglet Profil

### Onglets principaux
- **📊 Planificateur** : Tous les paramètres d'entrée et calculs
- **📈 Profil** : Graphique 2D des plongées (bleu + violet si successive)
- **📋 Tables** : Consultation des 4 tables MN90 complètes

---

## 🔒 Sécurité & Règles MN90

> ⚠️ **ATTENTION** : Ce calculateur est un aide-mémoire. Consultez TOUJOURS vos tables papier et un moniteur diplômé avant de plonger.

### Paliers à 6m
- Paliers obligatoires selon les tables
- Minimum 3 minutes par palier si indiqué
- Vitesse de remontée : 15-17 m/min **MAX**

### Plongées successives
- Intervalle minimum : **15 minutes**
- Plongée 2 toujours **moins profonde** que plongée 1
- Azote résiduel pris en compte (majoration)
- Max 4 plongées en 24h

### Limites de profondeur
- 🟢 < 20m : Très sûr
- 🟡 20-40m : Plongée intermédiaire
- 🔴 > 40m : Plongée profonde (attention accrue)
- 🔴🔴 > 60m : DANGER (bien au-delà des limites N2/N3)

---

## 🎨 Palette de couleurs GPS

Les lettres GPS changent de couleur pour visualiser le changement d'azote résiduel :

| GPS | Couleur | Signification |
|-----|---------|---------------|
| A | 🟢 Vert | Peu d'azote résiduel |
| B-E | 🔵 Bleu | Azote modéré |
| F-I | 🟠 Orange | Azote important |
| J-M | 🔴 Rouge | Azote très important |
| N-O | 🔴🔴 Rouge foncé | Azote critique |
| P | ⚫ Noir | Azote maximal |
| Z | ⚪ Gris | Azote éliminé |

---

## 📊 Exemple d'utilisation

### Scénario : Plongée successive en mer

**Plongée 1** 🌊
- Profondeur : 25m
- Durée : 45 minutes
- → Palier : 27 min | GPS : N | Remontée : 29 min

**Surface** ⏱️
- Intervalle : 60 minutes
- → Azote résiduel : L

**Plongée 2** 🤿
- Profondeur : 18m
- Durée : 35 minutes
- → Majoration : 21 min | Durée fictive : 56 min
- → Palier : 36 min | GPS : P

✅ **Plongée autorisée** mais prise en charge d'azote élevée. Envisager un intervalle plus long.

---

## 🛠️ Technologies

- **HTML5** : Structure responsive
- **CSS3** : Gradients, animations, grid/flexbox
- **JavaScript Vanilla** : Zéro dépendance
- **Chart.js** : Graphiques (CDN)
- **Unicode Emojis** : 🤿🐠🐟 Décoration

Fichier **unique** : ~15 KB (inclut HTML + CSS + JS)

---

## 📱 Compatibilité

| Appareil | Navigateur | Support |
|----------|-----------|---------|
| 🖥️ Desktop | Chrome, Firefox, Edge | ✅ Excellent |
| 📱 Mobile | Chrome, Safari, Firefox | ✅ Optimisé |
| 📱 Tablette | Tous navigateurs modernes | ✅ Optimisé |
| 🌐 Web App | PWA possible | ✅ À faire |

Testé sur :
- iPhone 12-15 (Safari)
- Samsung Galaxy (Chrome)
- iPad (Safari)
- Desktop Windows/Mac

---

## ⚠️ Limitations & Disclaimers

### Limitations techniques
- Arrondi des profondeurs au mètre près
- Temps arrondis aux 5 minutes
- Calculs basés sur tables MN90 statiques
- Pas de calcul de décompression progressif (remontée step-by-step)

### Avertissements de sécurité
- **Ne remplace JAMAIS les tables papier MN90 officielles**
- **Ne remplace JAMAIS un ordinateur de plongée**
- **Consultez un moniteur diplômé FFESSM avant use**
- **Plongez TOUJOURS en palanquée avec un binôme**
- **Vérifiez votre matériel et vos certifications**
- **Respectez le code du plongeur responsable**

Cet outil est destiné à la **formation et l'aide-mémoire uniquement**.

---

## 💾 Installation locale

### Avec git
```bash
git clone https://github.com/SOARES-Denis/MN90Mobile.git
cd MN90Mobile
open MN90Mobile.html  # Mac
# ou
xdg-open MN90Mobile.html  # Linux
# ou
start MN90Mobile.html  # Windows
```

### Sans git
1. Télécharger le fichier `MN90Mobile.html`
2. Double-cliquer pour ouvrir dans le navigateur
3. C'est tout ! ✅

---

## 🤝 Contribution

Les contributions sont bienvenues ! Suggestions :

- 🐛 Corrections de bugs
- 🎨 Améliorations UI/UX
- 📱 Support PWA
- 🌍 Traductions (EN, ES, DE, IT)
- 📊 Exports (PDF, PNG de profil)
- ⌚ Intégration Suunto/Shearwater

Pour contribuer :
```bash
1. Fork le projet
2. Créer une branche (git checkout -b feature/AmaCool)
3. Commiter (git commit -m 'Add: Super fonctionnalité')
4. Pusher (git push origin feature/AmaCool)
5. Ouvrir une Pull Request
```

---

## 📝 Changelog

### v1.0 - MVP (Actuel)
- ✅ Tables MN90 complètes
- ✅ Calcul plongées simples et successives
- ✅ UI responsive et animée
- ✅ Alertes de sécurité
- ✅ Profil graphique
- ✅ Tables consultables

### v1.1 (Prévu)
- 🔜 Plongées en altitude
- 🔜 Historique des plongées
- 🔜 Export PDF
- 🔜 PWA (offline mode)

### v2.0 (Futur)
- 🔜 Support ordinateurs de plongée (profils réels)
- 🔜 Décompression progressive
- 🔜 Mode sombre/clair
- 🔜 Multlangues

---

## 📄 Licence

MIT License - Libre d'utilisation, modification et distribution.

Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👨‍💻 Créateur

**SOARES Denis** 🤿

- 🌐 Portfolio : [Lien vers votre site]
- 📧 Email : [Votre email]
- 💼 LinkedIn : [Votre profil]
- 🐙 GitHub : [SOARES-Denis](https://github.com/SOARES-Denis)

---

## 📚 Ressources MN90

- [FFESSM - Fédération Française d'Études Sports Sous-Marins](https://www.ffessm.fr)
- [Tables MN90 PDF officiel](https://www.ffessm.fr)
- [Code du plongeur responsable](https://www.ffessm.fr)
- [Certification N1, N2, N3](https://www.ffessm.fr)

---

## 🙏 Remerciements

- Tables MN90 : FFESSM / COMEX
- Inspiration graphique : Designs sous-marins modernes
- Communauté plongée francophone

---

## 📞 Support

Besoin d'aide ? Consultez :
- 📖 Documentation ci-dessus
- 🐛 [Issues GitHub](https://github.com/SOARES-Denis/MN90Mobile/issues)
- 📧 Email direct

---

<div align="center">

### 🤿 Plongez en toute sécurité ! 🤿

*Créé avec ❤️ pour les plongeurs francophones*

[![GitHub License](https://img.shields.io/github/license/SOARES-Denis/MN90Mobile)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/SOARES-Denis/MN90Mobile?style=social)](https://github.com/SOARES-Denis/MN90Mobile)
[![GitHub Issues](https://img.shields.io/github/issues/SOARES-Denis/MN90Mobile)](https://github.com/SOARES-Denis/MN90Mobile/issues)

</div>