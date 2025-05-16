import { trajectoires, trajReference, scene } from "./main.js";
import { ajouterListeTrajectoires } from "./main.js";


export function importTrajectoryCSV(file) {
  document.querySelector('.info').innerHTML = `Chargement de la trajectoire ${file.name}...`;
  
  const reader = new FileReader();
  reader.onload = function(event) {
      const contenu = event.target.result; // Contenu du fichier
      console.warn("Fichier: " + file.name);
      
      // Parser directement le contenu du fichier, ne pas refaire de fetch
      try {
          const points = parseCSVContent(contenu, false); // Utiliser le contenu déjà chargé
          
          if (points.length === 0) {
              throw new Error("Aucun point valide n'a été trouvé dans le fichier CSV");
          }
          
          // Créer un objet trajectoire avec la couleur suivante disponible
          const nextColorIndex = trajectoires.length % 7;
          const couleurs = [
              0xff0000, // Rouge
              0x0000ff, // Bleu
              0x00ff00, // Vert
              0xffff00, // Jaune
              0xff00ff, // Magenta
              0x00ffff, // Cyan
              0xff8800  // Orange
          ];
          
          const couleur = new THREE.Color(couleurs[nextColorIndex]);
          const objetsTrajectoire = creerObjetsTrajectoire(points, couleur);
          
          // Ajouter la trajectoire au tableau des trajectoires
          trajectoires.push({
              points: points,
              objets: objetsTrajectoire,
              couleur: couleur,
              nom: file.name.replace('.csv', '')
          });
          
          // Si c'est la première trajectoire, la définir comme référence
          if (trajectoires.length === 1) {
              trajReference = trajectoires[0];
              animationTrajectoire.trajectoirePoints = trajReference.points;
          }
          
          document.querySelector('.info').innerHTML = `Trajectoire ${file.name} chargée (${points.length} points)`;
          
          // Mettre à jour la liste des trajectoires affichée
          // Supprimer l'ancienne liste
          const listeContainer = document.getElementById('liste-trajectoires');
          if (listeContainer) {
              listeContainer.innerHTML = '';
          }
          
          // Recréer la liste
          ajouterListeTrajectoires();
          
          console.log(`Trajectoire chargée avec succès: ${points.length} points`);
          console.log("Premier point:" + points[0]);
          console.log("Dernier point:" + points[points.length-1]);
          
      } catch (error) {
          console.error('Erreur lors du parsing de la trajectoire:', error);
          document.querySelector('.info').innerHTML = `Erreur lors du chargement de la trajectoire ${file.name}: ${error.message}`;
      }
  };
  
  reader.onerror = function() {
      console.error('Erreur lors de la lecture du fichier');
      document.querySelector('.info').innerHTML = 'Erreur lors de la lecture du fichier';
  };
  
  reader.readAsText(file);
}

export function chargerTrajectoireCSV(fichierPath = './example/poses.csv', transformCoords = false) {
  return new Promise((resolve, reject) => {
    // Utiliser fetch pour charger le fichier depuis le serveur
    fetch(fichierPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.text();
      })
      .then(contenu => {
        const points = parseCSVContent(contenu, transformCoords);
        
        if (points.length === 0) {
          reject(new Error("Aucun point valide n'a été trouvé dans le fichier CSV"));
        } else {
          console.log(`Trajectoire ${fichierPath}  chargée avec succès: ${points.length} points`);
          console.log("Premier point:", points[0]);
          console.log("Dernier point:", points[points.length-1]);
          resolve(points);
        }
      })
      .catch(error => {
        console.error("Erreur lors du chargement du fichier CSV:", error);
        reject(error);
      });
  });
}

function parseCSVContent(contenu, transformCoords = false) {
  const points = [];
  const lignes = contenu.split('\n');
  
  // Amélioration : Vérifier plus largement si la première ligne est un en-tête
  const premiereLigne = lignes[0].trim().toLowerCase();
  const debutIndex = (
    premiereLigne.includes('timestamp') && 
    premiereLigne.includes('x') && 
    premiereLigne.includes('y') && 
    premiereLigne.includes('z')
  ) ? 1 : 0;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const rawPoints = [];
  
  for (let i = debutIndex; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (ligne === '') continue;
    
    const valeurs = ligne.split(',');
    if (valeurs.length >= 8) {
      const timestamp = parseFloat(valeurs[0]);
      const x = parseFloat(valeurs[1]);
      const y = parseFloat(valeurs[2]);
      const z = parseFloat(valeurs[3]);
      const qx = parseFloat(valeurs[4]);
      const qy = parseFloat(valeurs[5]);
      const qz = parseFloat(valeurs[6]);
      const qw = parseFloat(valeurs[7]);
      
      if ([timestamp, x, y, z, qx, qy, qz, qw].every(v => !isNaN(v))) {
        rawPoints.push({ timestamp, x, y, z, qx, qy, qz, qw });

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }
    }
  }

  const maxRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scaleFactor = (maxRange > 0 && transformCoords) ? 10 / maxRange : 1;

  rawPoints.forEach(p => {
    let vec, quat;

    if (transformCoords) {
      const transformedX = (p.x - minX) * scaleFactor;
      const transformedY = (p.z - minZ) * scaleFactor;
      const transformedZ = (p.y - minY) * scaleFactor;

      vec = new THREE.Vector3(transformedX, transformedY, transformedZ);

      // Transformation du quaternion dans le nouveau repère
      const qOriginal = new THREE.Quaternion(p.qx, p.qy, p.qz, p.qw);
      const rotateQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      quat = qOriginal.clone().premultiply(rotateQuat);
    } else {
      vec = new THREE.Vector3(p.x, p.y, p.z);
      quat = new THREE.Quaternion(p.qx, p.qy, p.qz, p.qw);
    }

    vec.quaternion = quat; 
    vec.timestamp = p.timestamp;
    points.push(vec);
  });

  if (transformCoords && points.length > 0) {
    console.log("Statistiques originales:");
    console.log(`X: min=${minX.toFixed(4)}, max=${maxX.toFixed(4)}`);
    console.log(`Y: min=${minY.toFixed(4)}, max=${maxY.toFixed(4)}`);
    console.log(`Z: min=${minZ.toFixed(4)}, max=${maxZ.toFixed(4)}`);
    console.log(`Facteur d'échelle: ${scaleFactor.toFixed(4)}`);
    console.log("Premier point transformé:", points[0]);
    console.log("Dernier point transformé:", points[points.length - 1]);
  }

  return points;
}


// Fonction pour générer une trajectoire aléatoire
export function genererTrajectoire(nombrePoints) {
  const points = [];
  const ecart = 0.1; // 10cm d'écart entre les points

  // Point de départ au centre
  points.push(new THREE.Vector3(0, 0, 0));

  // Générer les points suivants
  for (let i = 1; i < nombrePoints; i++) {
      const dernierPoint = points[i - 1].clone();

      // Directions possibles (gauche, droite, devant, diagonales)
      const directions = [
          new THREE.Vector3(-ecart, 0, 0),      // gauche
          new THREE.Vector3(ecart, 0, 0),       // droite
          new THREE.Vector3(0, 0, -ecart),      // devant
          //new THREE.Vector3(0, 0, ecart),       // derrière
          new THREE.Vector3(-ecart, 0, -ecart), // diagonale avant-gauche
          new THREE.Vector3(ecart, 0, -ecart),  // diagonale avant-droite
          //new THREE.Vector3(-ecart, 0, ecart),  // diagonale arrière-gauche
          //new THREE.Vector3(ecart, 0, ecart)    // diagonale arrière-droite
      ];

      // Choisir une direction aléatoire
      const direction = directions[Math.floor(Math.random() * directions.length)];

      // Calculer le nouveau point
      const nouveauPoint = dernierPoint.add(direction);

      // Ajouter légère variation en hauteur pour plus de réalisme (-2cm à +2cm)
      const variationHauteur = (Math.random() - 0.5) * 0.04;
      nouveauPoint.y += variationHauteur;

      points.push(nouveauPoint);
  }

  return points;
}


export function creerObjetsTrajectoire(points, couleur) {
  const geometriePoints = new THREE.BufferGeometry();
  geometriePoints.setFromPoints([]); // Commence vide

  // Matériel pour les points
  const materielPoints = new THREE.PointsMaterial({
      color: couleur,
      size: 0.5,
      sizeAttenuation: true
  });
  const pointsObjet = new THREE.Points(geometriePoints, materielPoints);
  scene.add(pointsObjet);

  // Matériel pour la ligne
  const materielLigne = new THREE.LineBasicMaterial({
      color: couleur,
      linewidth: 2
  });
  const ligneObjet = new THREE.Line(geometriePoints, materielLigne);
  scene.add(ligneObjet);

  return { points: pointsObjet, ligne: ligneObjet };
}