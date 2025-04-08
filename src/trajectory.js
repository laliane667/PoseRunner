/*export function chargerTrajectoireCSV(fichierPath = './poses.csv') {
    return new Promise((resolve, reject) => {
      const points = [];
      
      // Utiliser fetch pour charger le fichier depuis le serveur
      fetch(fichierPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }
          return response.text();
        })
        .then(contenu => {
          const lignes = contenu.split('\n');
          
          // Ignorer la première ligne si c'est un en-tête
          const premiereLigne = lignes[0].trim();
          const debutIndex = premiereLigne.startsWith('timestamp,x,y,z') ? 1 : 0;
          
          // Parcourir chaque ligne du fichier
          for (let i = debutIndex; i < lignes.length; i++) {
            const ligne = lignes[i].trim();
            if (ligne === '') continue; // Ignorer les lignes vides
            
            const valeurs = ligne.split(',');
            if (valeurs.length >= 4) { // Au minimum timestamp, x, y, z
              // Extraire les coordonnées x, y, z (index 1, 2, 3 après le timestamp)
              const x = parseFloat(valeurs[1]);
              const y = parseFloat(valeurs[2]);
              const z = parseFloat(valeurs[3]);
              
              // Vérifier si les coordonnées sont des nombres valides
              if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                points.push(new THREE.Vector3(x, y, z));
              }
            }
          }
          
          if (points.length === 0) {
            reject(new Error("Aucun point valide n'a été trouvé dans le fichier CSV"));
          } else {
            console.log(`Trajectoire chargée avec succès: ${points.length} points`);
            resolve(points);
          }
        })
        .catch(error => {
          console.error("Erreur lors du chargement du fichier CSV:", error);
          reject(error);
        });
    });
  }
  
  // Fonction qui combine le chargement par défaut et le chargement à partir d'un fichier utilisateur
  export function chargerTrajectoire(fichierUtilisateur = null) {
    if (fichierUtilisateur) {
      // Si un fichier est fourni par l'utilisateur, utiliser FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
          const contenu = event.target.result;
          const points = parseCSVContent(contenu);
          if (points.length > 0) {
            console.log(`Trajectoire chargée depuis le fichier utilisateur: ${points.length} points`);
            resolve(points);
          } else {
            reject(new Error("Aucun point valide n'a été trouvé dans le fichier CSV"));
          }
        };
        
        reader.onerror = function() {
          reject(new Error("Erreur lors de la lecture du fichier CSV"));
        };
        
        reader.readAsText(fichierUtilisateur);
      });
    } else {
      // Sinon, charger le fichier par défaut
      return chargerTrajectoireCSV();
    }
  }
  
  // Fonction auxiliaire pour parser le contenu CSV
  function parseCSVContent(contenu) {
    const points = [];
    const lignes = contenu.split('\n');
    
    // Ignorer la première ligne si c'est un en-tête
    const premiereLigne = lignes[0].trim();
    const debutIndex = premiereLigne.startsWith('timestamp,x,y,z') ? 1 : 0;
    
    // Parcourir chaque ligne du fichier
    for (let i = debutIndex; i < lignes.length; i++) {
      const ligne = lignes[i].trim();
      if (ligne === '') continue; // Ignorer les lignes vides
      
      const valeurs = ligne.split(',');
      if (valeurs.length >= 4) { // Au minimum timestamp, x, y, z
        // Extraire les coordonnées x, y, z (index 1, 2, 3 après le timestamp)
        const x = parseFloat(valeurs[1]);
        const y = parseFloat(valeurs[2]);
        const z = parseFloat(valeurs[3]);
        
        // Vérifier si les coordonnées sont des nombres valides
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    
    return points;
  }

*/


export function chargerTrajectoireCSV(fichierPath = './data/poses.csv', transformCoords = false) {
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
          console.log(`Trajectoire chargée avec succès: ${points.length} points`);
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

// Fonction auxiliaire pour parser le contenu CSV avec transformation optionnelle
function parseCSVContent(contenu, transformCoords = false) {
  const points = [];
  const lignes = contenu.split('\n');
  
  // Ignorer la première ligne si c'est un en-tête
  const premiereLigne = lignes[0].trim();
  const debutIndex = premiereLigne.startsWith('timestamp,x,y,z') ? 1 : 0;
  
  // Variables pour la normalisation
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const rawPoints = [];
  
  // Premier passage pour collecter les points et trouver les min/max
  for (let i = debutIndex; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (ligne === '') continue; // Ignorer les lignes vides
    
    const valeurs = ligne.split(',');
    if (valeurs.length >= 4) { // Au minimum timestamp, x, y, z
      // Extraire les coordonnées x, y, z (index 1, 2, 3 après le timestamp)
      const x = parseFloat(valeurs[1]);
      const y = parseFloat(valeurs[2]);
      const z = parseFloat(valeurs[3]);
      
      // Vérifier si les coordonnées sont des nombres valides
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        rawPoints.push({x, y, z});
        
        // Mettre à jour les min/max
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }
    }
  }
  
  // Calculer le facteur d'échelle pour normaliser la trajectoire
  const maxRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scaleFactor = (maxRange > 0 && transformCoords) ? 10 / maxRange : 1;
  
  // Deuxième passage pour transformer les points selon le système de coordonnées choisi
  rawPoints.forEach(p => {
    if (transformCoords) {
      // Transformer les coordonnées: 
      // - Centrer autour de l'origine
      // - Changer le système de coordonnées (x,y,z) -> (x,z,y) pour que Y soit la hauteur
      // - Appliquer le facteur d'échelle pour que la trajectoire ait une taille raisonnable
      const transformedX = (p.x - minX) * scaleFactor;
      const transformedY = (p.z - minZ) * scaleFactor; // Z -> Y (hauteur)
      const transformedZ = (p.y - minY) * scaleFactor; // Y -> Z
      
      points.push(new THREE.Vector3(transformedX, transformedY, transformedZ));
    } else {
      // Utiliser les coordonnées telles quelles
      points.push(new THREE.Vector3(p.x, p.y, p.z));
    }
  });
  
  // Afficher des infos de debug
  if (transformCoords && points.length > 0) {
    console.log("Statistiques originales:");
    console.log(`X: min=${minX.toFixed(4)}, max=${maxX.toFixed(4)}`);
    console.log(`Y: min=${minY.toFixed(4)}, max=${maxY.toFixed(4)}`);
    console.log(`Z: min=${minZ.toFixed(4)}, max=${maxZ.toFixed(4)}`);
    console.log(`Facteur d'échelle: ${scaleFactor.toFixed(4)}`);
    
    // Vérifier la transformation
    const firstP = points[0];
    const lastP = points[points.length-1];
    console.log("Premier point transformé:", firstP);
    console.log("Dernier point transformé:", lastP);
  }
  
  return points;
}

// Fonction qui combine le chargement par défaut et le chargement à partir d'un fichier utilisateur
export function chargerTrajectoire(fichierUtilisateur = null, transformCoords = true) {
  /*if (fichierUtilisateur) {
    // Si un fichier est fourni par l'utilisateur, utiliser FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const contenu = event.target.result;
        const points = parseCSVContent(contenu, transformCoords);
        if (points.length > 0) {
          console.log(`Trajectoire chargée depuis le fichier utilisateur: ${points.length} points`);
          resolve(points);
        } else {
          reject(new Error("Aucun point valide n'a été trouvé dans le fichier CSV"));
        }
      };
      
      reader.onerror = function() {
        reject(new Error("Erreur lors de la lecture du fichier CSV"));
      };
      
      reader.readAsText(fichierUtilisateur);
    });
  } else {
    // Sinon, charger le fichier par défaut*/
    return chargerTrajectoireCSV();
  //}
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