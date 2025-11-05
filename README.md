# 🤿 MN90Mobile - Planificateur de Plongée

Un calculateur de plongée interactif et responsive basé sur les **Tables MN90-FFESSM**, conçu pour les plongeurs à l'air comprimé.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Mobile](https://img.shields.io/badge/responsive-mobile%20%2F%20desktop-brightgreen)

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Utilisation](#-utilisation)
- [Installation](#-installation)
- [Interface](#-interface)
- [Technologie](#-technologie)
- [Licence](#-licence)

---

## ✨ Fonctionnalités

### 📊 Planificateur de Plongée
- **Profil unique** : Calculez les paliers de décompression pour une plongée simple
- **Plongées successives** : Planifiez deux plongées avec intervalle en surface
- **Paliers intelligents** :
  - Palier 6m obligatoire (selon MN90)
  - Palier 3m de sécurité supplémentaire
- **Calcul DTR** (Durée Totale de Remontée)
- **GPS (Groupe de Plongée)** automatique selon profondeur et durée

### 🫁 Autonomie Optimale
- Prédiction du **temps maximum au fond** selon votre consommation
- **Consommation en surface** (adaptée à la profondeur)
- Calcul de l'autonomie avec paliers inclus
- Sélection de **bouteilles réalistes** (10L à 20L)
- Réserve de sécurité configurable (en bar)
- **Graphique dual-axis** : profondeur + pression en temps réel

### 📈 Visualisation Avancée
- **Profil de plongée graphique** en temps réel
- **Dual-plongées** avec couleurs distinctes (Rose 🔷 / Cyan 🔷)
- **Ligne d'intervalle** en blanc pour les plongées successives
- **Code couleur paliers** : Orange (6m) / Vert (3m)
- **Graphe de pression** avec dégradés de couleur (Vert → Jaune → Orange → Rouge)
- Légende interactive et tooltips détaillés

### 📚 Tables MN90-FFESSM
- **Tableau principal** de désaturation (6-75m)
- **Tableau I** : Azote résiduel
- **Tableau II** : Majoration
- **Tableau III** : Réduction O2
- **Tableau IV** : Remontée
- Toutes les tables accessibles dans une modal

### 🌊 Animations Fond Marin
- 🫧 **Bulles** montantes (3 tailles, mouvements fluides)
- 🐠 **Poissons** animés (🐠 🐟 🦈 🐙)
- 🌿 **Algues** ondulantes (🌿 🪷 🌱)
- Atmosphère immersive sous-marine

### 📱 Responsive Design
- **Mobile-first** : Layout vertical avec graphe en footer
- **Desktop** : Layout côte à côte optimisé
- **Redimensionnable** : Ajustez la hauteur du graphe sur mobile ou la largeur sur desktop
- Splitter intuitif avec curseur adaptatif

---

## 🚀 Utilisation

### Mode Planificateur

1. **Réglez la profondeur** de votre plongée (6-65m)
2. **Indiquez le temps au fond** souhaité (1-400 min)
3. **Consultez les résultats** :
   - Paliers obligatoires
   - Temps total de remontée
   - Groupe de plongée

**Pour une plongée successive :**
4. Cochez **"Ajouter 2ème plongée"**
5. Réglez l'intervalle en surface
6. Configurez la 2ème plongée
7. Visualisez les deux profils superposés

### Mode Autonomie

1. **Profondeur visée** : Réglez votre profondeur de plongée
2. **Conso en surface** : Entrez votre consommation réelle à cette profondeur
3. **Bouteille** : Sélectionnez la capacité (10-20L)
4. **Pression initiale** : Pression au départ (50-300 bar)
5. **Réserve** : Marge de sécurité (0-100 bar)
6. **Consultez** :
   - Temps max au fond
   - Autonomie totale avec paliers
   - Pression à la surface

### Consulter les Tables

Cliquez sur **"📊 AFFICHER TABLES MN90 COMPLÈTES"** pour accéder à toutes les tables de référence officielles MN90-FFESSM.

---

## 💻 Installation

### Option 1 : En ligne (Recommandée)
Ouvrez directement le fichier HTML dans votre navigateur :
```bash
MN90Mobile.html
```

### Option 2 : Serveur local
```bash
# Avec Python 3
python -m http.server 8000

# Avec Python 2
python -m SimpleHTTPServer 8000

# Puis accédez à http://localhost:8000
```

### Option 3 : Serveur Node.js
```bash
npm install -g http-server
http-server
```

---

## 🎨 Interface

### Onglets
- **📊 Planificateur** : Calculez vos plongées
- **🫁 Autonomie Optimale** : Optimisez votre temps au fond
- **📋 Tables MN90** : Consultez les tables officielles

### Panneau Gauche
- Entrées de paramètres (sliders intuitifs)
- Résultats instantanés colorisés
- Explications détaillées
- Info-box pédagogique

### Panneau Droit (Footer Mobile)
- Graphe de profil interactif
- Légende détaillée
- Explication textuelle
- Redimensionnable

---

## 🛠 Technologie

### Frontend
- **HTML5** : Structure sémantique
- **CSS3** : Animations fluides, responsive design
  - Gradients et transparences
  - Keyframes pour bulles/poissons/algues
  - Media queries (mobile/desktop)
  - Flexbox & Grid

- **JavaScript (Vanilla)** : Logique pure
  - Algorithme MN90-FFESSM
  - Calcul de décompression
  - Gestion du graphe dynamique
  - Event listeners pour interaction
  
- **Chart.js 3.9.1** : Visualisation graphique
  - Graphes dual-axis
  - Segments de couleur
  - Tooltips interactifs

### Architecture
```
MN90Mobile.html (Fichier unique)
├── HTML (Sections, Input, Canvas)
├── CSS (Styling, Animations, Responsive)
└── JavaScript (Logique, Calculs, Interactivité)
```

### Compatibilité
- ✅ Chrome/Edge (dernières versions)
- ✅ Firefox (dernières versions)
- ✅ Safari (iOS 12+)
- ✅ Tous les navigateurs modernes
- ✅ Mobile (iOS/Android)
- ✅ Tablet (iPad, etc.)

---

## 📐 Spécifications Techniques

### Profondeurs supportées
- Min : 6m
- Max : 75m
- Tables MN90 officielles

### Durées au fond
- Min : 1 min
- Max : 400 min
- Résolution : 1 min

### Bouteilles autonomie
- Min : 10L
- Max : 20L
- Résolution : 0.5L

### Pressions
- Init : 50-300 bar
- Réserve : 0-100 bar
- Résolution : 1 bar

---

## 🎯 Fonctionnalités Détaillées

### Calculs MN90
- Détermine les paliers selon profondeur/durée
- Ajoute palier 3m de sécurité
- Calcule DTR (temps total remontée)
- Génère GPS (Groupe de Plongée)
- Supporte plongées successives avec majoration

### Graphiques
- **Plongée 1** : Rose (#FF99FF)
- **Plongée 2** : Cyan (#00CCFF)
- **Intervalle** : Blanc pointillé (#FFFFFF)
- **Palier 6m** : Orange (#FFA500)
- **Palier 3m** : Vert (#22FF00)
- **Pression** : Dégradé couleur temps réel

### Animations
- Bulles montantes (4-6s)
- Poissons nageants (15-20s)
- Algues ondulantes (3s)
- 15+ éléments animés simultanément

---

## 📱 Responsive Breakpoints

| Device | Breakpoint | Layout | Splitter |
|--------|-----------|--------|----------|
| Mobile | < 1024px | Vertical (Stack) | Horizontal (hauteur) |
| Tablet | 1024-1365px | Horizontal | Vertical (largeur) |
| Desktop | ≥ 1366px | Horizontal (optimisé) | Vertical (largeur) |

---

## ⚖️ Licence

MIT License - Voir le fichier LICENSE pour les détails.

```
Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software...
```

---

## 🤝 Contribution

Les contributions sont bienvenues ! Pour contribuer :

1. **Fork** le repository
2. **Créez une branche** : `git checkout -b feature/ma-feature`
3. **Committez** : `git commit -m 'Ajoute ma-feature'`
4. **Push** : `git push origin feature/ma-feature`
5. **Ouvrez une Pull Request**

### Ideas de Features
- [ ] Profils utilisateur personnalisés
- [ ] Export PDF du plan de plongée
- [ ] Calcul avec Nitrox/Trimix
- [ ] Historique des plongées
- [ ] API intégration météo/marées
- [ ] Partage de plans de plongée
- [ ] Support du multi-langue

---

## ⚠️ Disclaimer

**IMPORTANT** : Ce calculateur est un **outil de planification éducatif**. 

- Ne remplacez **jamais** vos tables officielles MN90-FFESSM
- Consultez un **instructeur FFESSM certifié** avant chaque plongée
- Respectez **TOUJOURS** les procédures de sécurité
- Testez en **milieu contrôlé** avant l'usage en conditions réelles
- Les développeurs ne sont **pas responsables** des accidents de plongée

*La plongée est une activité dangereuse. Entraînez-vous correctement.*

---

## 📞 Support

Pour les problèmes, suggestions ou questions :

1. Consultez la [documentation MN90-FFESSM officielle](https://www.ffessm.fr/)
2. Ouvrez une [Issue sur GitHub](https://github.com/yourname/MN90Mobile/issues)
3. Contactez un instructeur FFESSM

---

## 🔗 Ressources

- **Tables MN90-FFESSM** : Standard de référence pour plongée à l'air
- **Chart.js** : https://www.chartjs.org/
- **FFESSM** : https://www.ffessm.fr/

---

## 🎉 Crédits

Développé avec ❤️ pour la communauté des plongeurs.

Merci à la FFESSM pour les tables MN90 officielles.

---

**Dernière mise à jour** : Novembre 2024

**Version** : 1.0.0

**Status** : ✅ Production Ready

---

## 📊 Stats

- **Animations** : 15+ éléments simultanés
- **Tables** : 60+ entrées MN90
- **Taille du fichier** : ~80KB (unique HTML)
- **Dépendances externes** : 1 (Chart.js CDN)
- **Temps de chargement** : < 1s
- **Support mobile** : 100%

---

**Bon courage pour vos plongées ! 🤿🌊✨**