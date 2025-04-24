import { scene } from './main.js';
export let matchPoints = []; // Pour stocker les points 3D
let matchPointsObject = null; // Pour stocker l'objet THREE.js représentant les points

/**
 * Charge un fichier CSV contenant des points 3D (format: x,y,z)
 * @param {string} filePath - Chemin vers le fichier CSV
 * @returns {Promise} - Promise résolu avec le tableau de points
 */
export function loadMatchPointsCSV(filePath) {
    return new Promise((resolve, reject) => {
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.text();
            })
            .then(csvData => {
                matchPoints = parseMatchPointsCSV(csvData);
                console.log(`${matchPoints.length} points de correspondance chargés`);
                resolve(matchPoints);
            })
            .catch(error => {
                console.error("Erreur lors du chargement du fichier de points:", error);
                reject(error);
            });
    });
}

/**
 * Parse le contenu CSV pour extraire les points 3D
 * @param {string} csvContent - Contenu du fichier CSV
 * @returns {Array} - Tableau de points {x, y, z, u, v}
 */
function parseMatchPointsCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const points = [];
    
    // Skip header line if it exists
    const startLine = lines[0].includes('x,y,z,u,v') ? 1 : 0;
    
    // Parse all lines (skipping header if present)
    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines or comments
        if (line === '' || line.startsWith('#')) continue;
        
        // Split values by commas or spaces
        const values = line.split(/[\s,]+/);
        
        // Check that we have at least 5 values (x, y, z, u, v)
        if (values.length >= 5) {
            const point = {
                x: parseFloat(values[0]),
                y: parseFloat(values[1]),
                z: parseFloat(values[2]),
                u: parseFloat(values[3]),
                v: parseFloat(values[4])
            };
            
            // Check that all values are numbers
            if (!isNaN(point.x) && !isNaN(point.y) && !isNaN(point.z) && 
                !isNaN(point.u) && !isNaN(point.v)) {
                points.push(point);
            }
        }
    }
    
    return points;
}

/**
 * Crée un objet THREE.js pour représenter les points dans la scène
 * @param {Array} points - Tableau de points {x, y, z}
 * @param {number} pointColor - Couleur des points (code couleur THREE.js)
 * @param {number} pointSize - Taille des points
 * @returns {THREE.Points} - Objet THREE.js contenant les points
 */
export function createMatchPointsObject(points, pointColor = 0x00ff00, pointSize = 0.1) {
    // Supprimer l'ancien objet s'il existe
    if (matchPointsObject) {
        scene.remove(matchPointsObject);
    }
    
    // Créer la géométrie pour les points
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    
    // Remplir le tableau de positions
    for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = points[i].z;
    }
    
    // Attribuer les positions à la géométrie
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Créer le matériau pour les points
    const material = new THREE.PointsMaterial({
        color: pointColor,
        size: pointSize,
        sizeAttenuation: true
    });
    
    // Créer l'objet Points
    matchPointsObject = new THREE.Points(geometry, material);
    matchPointsObject.name = "matchPoints";
    
    // Ajouter à la scène
    scene.add(matchPointsObject);
    
    return matchPointsObject;
}

/**
 * Charge un fichier CSV et affiche les points dans la scène
 * @param {string} filePath - Chemin vers le fichier CSV
 * @param {number} pointColor - Couleur des points (code couleur THREE.js)
 * @param {number} pointSize - Taille des points
 * @returns {Promise} - Promise résolu quand les points sont affichés
 */
export function loadAndDisplayMatchPoints(filePath, pointColor = 0x00ff00, pointSize = 0.1) {
    return loadMatchPointsCSV(filePath)
        .then(points => {
            return createMatchPointsObject(points, pointColor, pointSize);
        })
        .catch(error => {
            console.error("Erreur lors du chargement et de l'affichage des points:", error);
            throw error;
        });
}

/**
 * Fonction pour charger un fichier depuis l'interface utilisateur
 * @param {File} file - Fichier CSV sélectionné par l'utilisateur
 * @param {number} pointColor - Couleur des points (code couleur THREE.js)
 * @param {number} pointSize - Taille des points
 * @returns {Promise} - Promise résolu quand les points sont affichés
 */
export function loadMatchPointsFromFile(file, pointColor = 0x00ff00, pointSize = 0.1) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                matchPoints = parseMatchPointsCSV(event.target.result);
                console.log(`${matchPoints.length} points de correspondance chargés depuis le fichier local`);
                const pointsObject = createMatchPointsObject(matchPoints, pointColor, pointSize);
                resolve(pointsObject);
            } catch (error) {
                console.error("Erreur lors du traitement du fichier:", error);
                reject(error);
            }
        };
        
        reader.onerror = function(event) {
            console.error("Erreur lors de la lecture du fichier:", event.target.error);
            reject(event.target.error);
        };
        
        reader.readAsText(file);
    });
}

/**
 * Configure les gestionnaires d'événements pour le chargement de fichiers
 */
export function setupMatchFileImport() {
    const fileInput = document.getElementById('matchPointsInput');
    if (!fileInput) {
        console.warn("Élément d'entrée de fichier pour les points de correspondance non trouvé");
        return;
    }
    
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        document.querySelector('.info').innerHTML = "Chargement des points de correspondance...";
        
        loadMatchPointsFromFile(file)
            .then(() => {
                document.querySelector('.info').innerHTML = `${matchPoints.length} points de correspondance chargés.`;
            })
            .catch(error => {
                document.querySelector('.info').innerHTML = "Erreur lors du chargement des points.";
                console.error(error);
            });
    });
}

/**
 * Ajoute une interface utilisateur pour importer des points de correspondance
 */
export function addMatchPointsImportUI() {
    // Créer un conteneur pour les contrôles
    const matchControlsDiv = document.createElement('div');
    matchControlsDiv.className = 'match-controls';
    matchControlsDiv.style.position = 'absolute';
    matchControlsDiv.style.top = '10px';
    matchControlsDiv.style.right = '10px';
    matchControlsDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    matchControlsDiv.style.padding = '10px';
    matchControlsDiv.style.borderRadius = '5px';
    
    // Ajouter un titre
    const title = document.createElement('h3');
    title.textContent = 'Points de correspondance';
    matchControlsDiv.appendChild(title);
    
    // Ajouter un input de fichier
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'matchPointsInput';
    fileInput.accept = '.csv,.txt';
    matchControlsDiv.appendChild(fileInput);
    
    // Ajouter un label pour le fichier
    const fileLabel = document.createElement('label');
    fileLabel.textContent = 'Charger des points (CSV):';
    fileLabel.htmlFor = 'matchPointsInput';
    matchControlsDiv.insertBefore(fileLabel, fileInput);
    
    // Ajouter le DIV à la page
    document.body.appendChild(matchControlsDiv);
    
    // Configurer l'événement de chargement
    setupMatchFileImport();
}