import { importTrajectoryCSV, genererTrajectoire, chargerTrajectoireCSV, creerObjetsTrajectoire} from "./trajectory.js";
import { loadCustomPointCloud } from "./map.js";

import { loadAndDisplayMatchPoints, addMatchPointsImportUI } from './match.js';

import { CameraFrustum } from "./camera-frustum.js";
export let trajectoires = []; // Tableau qui contiendra toutes les trajectoires
export let trajReference = null; // Référence vers la trajectoire de vérité (index 0)
// Variables globales
export let scene, camera, renderer, controls;
export let pointCloud;
export const pointSize = 0.05;
export let cameraFrustum; // Nouvelle variable pour le frustum

export function setPointCloud(newPointCloud) {
    pointCloud = newPointCloud;
}

function init() {
    // Reste du code inchangé...
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

    const canvas = document.getElementById("myCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    //loadPointCloud();

    //loadAndDisplayMatchPoints('./data/000000.csv', 0x00ff00, 0.1);
    //loadAndDisplayMatchPoints('./data/000800.csv', 0x00ff00, 0.1);
    loadAndDisplayMatchPoints('./data/vincent/pointcloud_0.1.csv', 0xff0000, 0.05);
    //initCameraFrustum();
    initKittiCameraFrustum();
    setupFrustumControls();
    // Chargement des trajectoires
    const fichiersPaths = [
        './data/GT_poses.csv',  // Trajectoire de vérité (référence)
        //'./example/poses.csv',
    ];

    const nomTrajectoires = [
        "Ground truth",
        "I2D-Loc",
    ];

    // Définir des couleurs distinctes pour chaque trajectoire
    const couleursTrajectoires = [
        0xff0000, // Rouge pour la trajectoire de vérité
        0x0000ff, // Vert pour trajectoire 1
        0x00ff00, // Vert pour trajectoire 1
    ];

    // Charger toutes les trajectoires de manière asynchrone
    const promesses = fichiersPaths.map((path, index) => {
        return chargerTrajectoireCSV(path)
            .then(points => {
                return {
                    points: points,
                    couleur: new THREE.Color(couleursTrajectoires[index]),
                    nom: nomTrajectoires[index]
                };
            })
            .catch(error => {
                console.error(`Erreur lors du chargement de la trajectoire ${index}:`, error);
                // Fallback: générer une trajectoire si le chargement échoue
                const pointsGenerés = genererTrajectoire(800, index);
                return {
                    points: pointsGenerés,
                    couleur: new THREE.Color(couleursTrajectoires[index]),
                    nom: nomTrajectoires[index] + " (générée)"
                };
            });
    });

    // Attendre que toutes les trajectoires soient chargées
    Promise.all(promesses)
        .then(results => {
            // Créer les objets de trajectoire et les ajouter au tableau
            results.forEach((result, index) => {
                const objetsTrajectoire = creerObjetsTrajectoire(result.points, result.couleur);
                trajectoires.push({
                    points: result.points,
                    objets: objetsTrajectoire,
                    couleur: result.couleur,
                    nom: result.nom
                });
            });

            // La première trajectoire est celle de référence
            trajReference = trajectoires[0];
            
            // Configurer l'animation avec la trajectoire de référence
            animationTrajectoire.trajectoirePoints = trajReference.points;
            
            document.querySelector('.info').innerHTML = `${trajectoires.length} trajectories successfully loaded.`;
            ajouterBoutonDemarrer();
            ajouterListeTrajectoires();
        })
        .catch(error => {
            console.error("Error occured during trajectories loading:", error);
            document.querySelector('.info').innerHTML = "Trajectories loading error";
        });

        setupFileImports();

    window.addEventListener('resize', onWindowResize);
    animate();
}


// Fonction pour initialiser le frustum de caméra
function initCameraFrustum() {
    // Paramètres du frustum - ajustez selon vos besoins
    const frustumParams = {
        fov: 60, 
        aspect: 4/3,
        near: 0.1,
        far: 5,
        color: 0xff0000,
        // Ajoutez votre calibration extrinsèque réelle ici
        calibration: { x: 0, y: 0, z: 0 },
        rotation: {
            roll: Math.PI / 2,//Math.PI / 6,    // 30°
            pitch: Math.PI,  // 15°
            yaw: Math.PI / 2     // 45°
        } 
    };
    
    // Créer le frustum
    cameraFrustum = new CameraFrustum(scene, frustumParams);
    
    // Position initiale (0,0,0)
    cameraFrustum.update(new THREE.Vector3(0, 0, 0));
}

// Fonction pour initialiser le frustum de caméra KITTI
function initKittiCameraFrustum() {
    // Paramètres intrinsèques de KITTI pour la caméra couleur
    // Ces valeurs sont généralement disponibles dans le fichier calib.txt de KITTI
    const kittiIntrinsics = {
        // Par exemple, pour la caméra couleur KITTI:
        fx: 721.5377, // Distance focale en x
        fy: 721.5377, // Distance focale en y
        cx: 609.5593, // Point principal x
        cy: 172.854, // Point principal y
        width: 1242, // Largeur de l'image en pixels
        height: 375, // Hauteur de l'image en pixels
    };
    
    // Si vous avez les valeurs exactes de votre dataset, remplacez-les ci-dessus
    
    // Paramètres de calibration extrinsèque pour KITTI
    // Ces valeurs sont également disponibles dans calib.txt
    const kittiExtrinsics = {
        x: 0.27, // Décalage en x par rapport au LIDAR (en mètres)
        y: 0.06, // Décalage en y par rapport au LIDAR (en mètres)
        z: 0.08  // Décalage en z par rapport au LIDAR (en mètres)
    };
    
    // Rotation de la caméra par rapport au LIDAR (en radians)
    const rotation = {
        roll: Math.PI / 2,//Math.PI / 6,    // 30°
        pitch: Math.PI,  // 15°
        yaw: Math.PI / 2     // 45°
    } ;
    
    // Créer le frustum avec les paramètres de KITTI
    cameraFrustum = new CameraFrustum(scene, {
        intrinsics: kittiIntrinsics,
        near: 0.1,
        far: 100.0, // La portée typique de KITTI est de 50-80 mètres
        color: 0xff0000, // Rouge pour la visualisation
        calibration: kittiExtrinsics,
        rotation: rotation
    });
    
    // Position initiale (0,0,0) - peut être ajustée selon vos besoins
    cameraFrustum.update(new THREE.Vector3(0, 0, 0));
}


// Ajouter des contrôles pour ajuster le frustum
function setupFrustumControls() {
    // Créer une section dans le GUI pour les contrôles du frustum
    const guiContainer = document.getElementById('gui');
    
    // Section pour les paramètres du frustum
    const frustumSection = document.createElement('div');
    frustumSection.className = 'gui-input';
    frustumSection.innerHTML = `
        <label for="frustum-fov">FOV: </label>
        <input type="range" id="frustum-fov" min="20" max="120" value="60" style="width: 100px;">
        <span id="frustum-fov-value">60°</span>
    `;
    guiContainer.appendChild(frustumSection);
    
    // Contrôles pour la calibration
    const calibX = document.createElement('div');
    calibX.className = 'gui-input';
    calibX.innerHTML = `
        <label for="calib-x">Calib X: </label>
        <input type="range" id="calib-x" min="-2" max="2" value="0" step="0.1" style="width: 100px;">
        <span id="calib-x-value">0</span>
    `;
    guiContainer.appendChild(calibX);
    
    const calibY = document.createElement('div');
    calibY.className = 'gui-input';
    calibY.innerHTML = `
        <label for="calib-y">Calib Y: </label>
        <input type="range" id="calib-y" min="-2" max="2" value="0" step="0.1" style="width: 100px;">
        <span id="calib-y-value">0</span>
    `;
    guiContainer.appendChild(calibY);
    
    const calibZ = document.createElement('div');
    calibZ.className = 'gui-input';
    calibZ.innerHTML = `
        <label for="calib-z">Calib Z: </label>
        <input type="range" id="calib-z" min="-2" max="2" value="0" step="0.1" style="width: 100px;">
        <span id="calib-z-value">0</span>
    `;
    guiContainer.appendChild(calibZ);
    
    // Écouteurs d'événements pour les contrôles
    document.getElementById('frustum-fov').addEventListener('input', function() {
        const fov = parseInt(this.value);
        document.getElementById('frustum-fov-value').textContent = fov + '°';
        cameraFrustum.setParams({ fov: fov });
    });
    
    document.getElementById('calib-x').addEventListener('input', function() {
        const x = parseFloat(this.value);
        document.getElementById('calib-x-value').textContent = x;
        cameraFrustum.setParams({ calibration: { 
            x: x,
            y: parseFloat(document.getElementById('calib-y').value),
            z: parseFloat(document.getElementById('calib-z').value)
        }});
    });
    
    document.getElementById('calib-y').addEventListener('input', function() {
        const y = parseFloat(this.value);
        document.getElementById('calib-y-value').textContent = y;
        cameraFrustum.setParams({ calibration: { 
            x: parseFloat(document.getElementById('calib-x').value),
            y: y,
            z: parseFloat(document.getElementById('calib-z').value)
        }});
    });
    
    document.getElementById('calib-z').addEventListener('input', function() {
        const z = parseFloat(this.value);
        document.getElementById('calib-z-value').textContent = z;
        cameraFrustum.setParams({ calibration: { 
            x: parseFloat(document.getElementById('calib-x').value),
            y: parseFloat(document.getElementById('calib-y').value),
            z: z
        }});
    });
    
    // Bouton pour activer/désactiver la visualisation du frustum
    const toggleButton = document.createElement('div');
    toggleButton.className = 'gui-row';
    toggleButton.innerHTML = `
        <button id="toggle-frustum">Hide Frustum</button>
    `;
    document.getElementById('gui-button-container').appendChild(toggleButton);
    
    let frustumVisible = true;
    document.getElementById('toggle-frustum').addEventListener('click', function() {
        if (frustumVisible) {
            cameraFrustum.hide();
            this.textContent = 'Show Frustum';
        } else {
            cameraFrustum.show();
            this.textContent = 'Hide Frustum';
        }
        frustumVisible = !frustumVisible;
    });
}

// Fonction pour mettre à jour le frustum durant l'animation
export function updateFrustumPosition(position, rotation = null) {
    if (cameraFrustum) {
        cameraFrustum.update(position, rotation);
    }
}


document.getElementById("export-csv").addEventListener("click", () => {
    if (!pointCloud || !pointCloud.geometry) {
        alert("Aucun nuage de points chargé !");
        return;
    }

    const positions = pointCloud.geometry.attributes.position.array;
    const numPoints = positions.length / 3;

    let csvContent = "x,y,z\n";
    for (let i = 0; i < numPoints; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        csvContent += `${x},${y},${z}\n`;
    }

    // Création du blob et téléchargement
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "pointcloud.csv";
    a.click();

    URL.revokeObjectURL(url);
});


function setupFileImports() {
    // Configuration pour l'importation de la carte (PCD)
    const importMapButton = document.getElementById('import-map');
    const mapFileInput = document.getElementById('map-file-input');
    
    importMapButton.addEventListener('click', () => {
        mapFileInput.click();
    });
    
    mapFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            loadCustomPointCloud(fileURL, file.name, scene, pointCloud, camera);
        }
    });
    
    // Configuration pour l'importation de trajectoire (CSV)
    const importTrajectoryButton = document.getElementById('import-trajectory');
    const trajectoryFileInput = document.getElementById('trajectory-file-input');
    
    importTrajectoryButton.addEventListener('click', () => {
        trajectoryFileInput.click();
    });
    
    trajectoryFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            alert("Importation")
            importTrajectoryCSV(file);
        }
    });
}





// Fonction pour créer un nuage de points de test
function createTestPointCloud() {
    const geometry = new THREE.BufferGeometry();
    const numPoints = 10000000;

    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    // Simuler une route avec des points autour
    for (let i = 0; i < numPoints; i++) {
        // Position
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        // Simuler une surface de route avec une légère variation de hauteur
        const y = -0.5 + Math.sin(x * 0.5) * 0.2 + Math.cos(z * 0.5) * 0.2;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Couleur basée sur la hauteur (du bleu au blanc)
        const heightColor = (y + 1) / 2; // Normaliser entre 0 et 1
        colors[i * 3] = heightColor;
        colors[i * 3 + 1] = heightColor;
        colors[i * 3 + 2] = heightColor;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: pointSize,
        vertexColors: true,
        sizeAttenuation: true
    });

    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
}


function loadPointCloud() {
    const loader = new THREE.PCDLoader();
    loader.load(
        //'example/mini_map.pcd', // Chemin vers votre fichier PCD
        './data/vincent/map-03-0.1.pcd', // Chemin vers votre fichier PCD
        function (points) {
            // Le loader crée automatiquement un objet Points
            scene.add(points);
            pointCloud = points;

            if (points.material) {
                points.material.size = pointSize;
                points.material.needsUpdate = true;
            }

            // Ajuster la caméra pour voir l'ensemble du nuage
            const box = new THREE.Box3().setFromObject(points);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Positionner la caméra pour voir l'ensemble du nuage
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
            cameraZ *= 1.5; // Facteur pour avoir une marge

            camera.position.set(center.x, center.y, center.z + cameraZ);
            camera.lookAt(center);
            controls.target.copy(center);

            document.querySelector('.info').innerHTML = 'PCD point cloud successfully loaded.';
        },
        function (xhr) {
            // Progression du chargement
            const percentComplete = xhr.loaded / xhr.total * 100;
            document.querySelector('.info').innerHTML = 'Loading: ' + Math.round(percentComplete) + '%';
        },
        function (error) {
            // Erreur de chargement
            console.error('Error occured during PCD file loading:', error);
            document.querySelector('.info').innerHTML = 'Error PCD loading';

            // Utiliser le nuage de test en cas d'erreur
            createTestPointCloud();
        }
    );
}



function afficherTrajectoire(points) {
    animationTrajectoire.trajectoirePoints = points;

    const geometriePoints = new THREE.BufferGeometry();
    geometriePoints.setFromPoints([]); // Commence vide

    // Matériel pour les points
    const materielPoints = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 0.5,
        sizeAttenuation: true
    });
    const pointsObjet = new THREE.Points(geometriePoints, materielPoints);
    scene.add(pointsObjet);

    // Matériel pour la ligne
    const materielLigne = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 20
    });
    const ligneObjet = new THREE.Line(geometriePoints, materielLigne);
    scene.add(ligneObjet);

    return { points: pointsObjet, ligne: ligneObjet };
}



function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


let cameraSmoothing = {
    targetPosition: new THREE.Vector3(), // Position cible où la caméra veut aller
    lerpFactor: 0.05,                    // Facteur de lissage (0-1) - plus petit = plus lisse mais plus lent
    followOffset: new THREE.Vector3(0, 0, 25) // Décalage de la caméra par rapport au point
};
// Restructurer l'objet animationTrajectoire
// Simplifier l'objet animationTrajectoire en supprimant les méthodes
const animationTrajectoire = {
    trajectoirePoints: [], // Points de la trajectoire de référence
    indexPointCourant: 0,
    estEnCours: false,
    vitesse: 10, // Points par seconde
    dernierTemps: 0
};

// Fonction séparée pour mettre à jour le frustum avec une position et rotation
function updateFrustumWithPose(position, rotation) {
    // Si vous avez des quaternions dans vos données de trajectoire
    if (position && cameraFrustum) {
        updateFrustumPosition(position, rotation);
    }
}

function mettreAJourAnimation(temps) {
    if (!animationTrajectoire.estEnCours || trajectoires.length === 0) return;

    const tempsDelta = temps - animationTrajectoire.dernierTemps;
    const pointsParFrame = (animationTrajectoire.vitesse * tempsDelta) / 1000;

    if (pointsParFrame < 1) {
        updateCameraPosition();
        return;
    }

    animationTrajectoire.dernierTemps = temps;

    const nouveauxPoints = Math.floor(pointsParFrame);
    let pointsFinaux = animationTrajectoire.indexPointCourant + nouveauxPoints;

    // S'assurer de ne pas dépasser le nombre de points disponibles
    const maxPoints = Math.min(...trajectoires.map(t => t.points.length));
    if (pointsFinaux >= maxPoints) {
        pointsFinaux = maxPoints;
        animationTrajectoire.estEnCours = false; // Animation terminée
        document.querySelector('.info').innerHTML = 'Animation terminée';
    }

    // Mettre à jour toutes les trajectoires
    for (let i = 0; i < trajectoires.length; i++) {
        const traj = trajectoires[i];
        
        // Ne pas dépasser le nombre de points de cette trajectoire
        const pointsFinauxTraj = Math.min(pointsFinaux, traj.points.length);
        
        // Extraire les points à afficher
        const pointsAAfficher = traj.points.slice(0, pointsFinauxTraj);
        
        // Mettre à jour la géométrie
        const geometriePoints = new THREE.BufferGeometry().setFromPoints(pointsAAfficher);
        traj.objets.points.geometry.dispose();
        traj.objets.points.geometry = geometriePoints;
        
        traj.objets.ligne.geometry.dispose();
        traj.objets.ligne.geometry = geometriePoints.clone();
    }

    animationTrajectoire.indexPointCourant = pointsFinaux;

    // Mettre à jour la position cible de la caméra avec la trajectoire de référence
    if (trajReference && trajReference.points.length > 0 && animationTrajectoire.indexPointCourant > 0) {
        const dernierPoint = trajReference.points[Math.min(animationTrajectoire.indexPointCourant - 1, trajReference.points.length - 1)];
        cameraSmoothing.targetPosition.copy(dernierPoint);
        
        // Mettre à jour la position et rotation du frustum de caméra
        const pointActuel = trajReference.points[Math.min(animationTrajectoire.indexPointCourant - 1, trajReference.points.length - 1)];
        // Position actuelle
        const position = new THREE.Vector3(
            pointActuel.x,
            pointActuel.y,
            pointActuel.z
        );
        
        // Rotation (si disponible)
        let rotation = null;
        if (pointActuel.quaternion.w !== undefined) {
            rotation = new THREE.Quaternion(
                pointActuel.quaternion.x,
                pointActuel.quaternion.y,
                pointActuel.quaternion.z,
                pointActuel.quaternion.w
            );
        } else if (pointActuel.roll !== undefined) {
            // Si vous avez des angles d'Euler (en radians)
            alert("Error: GT rot must be a quaternion")
            rotation = new THREE.Euler(
                pointActuel.roll,
                pointActuel.pitch,
                pointActuel.yaw,
                'XYZ'
            );
            // Convertir en quaternion
            rotation = new THREE.Quaternion().setFromEuler(rotation);
        }else{
            alert("Error: GT rot format is invalid")
        }
        
        // Mettre à jour le frustum
        updateFrustumWithPose(position, rotation);
    }
}
function updateCameraPosition() {
    if (animationTrajectoire.estEnCours === false) return;
    const idealPosition = new THREE.Vector3().copy(cameraSmoothing.targetPosition).add(cameraSmoothing.followOffset);
    camera.position.lerp(idealPosition, cameraSmoothing.lerpFactor);
    controls.target.lerp(cameraSmoothing.targetPosition, cameraSmoothing.lerpFactor * 1.5);
    controls.update();
}

function animate(temps) {
    requestAnimationFrame(animate);

    mettreAJourAnimation(temps);
    updateCameraPosition();

    controls.update();
    renderer.render(scene, camera);
}
function ajouterBoutonDemarrer() {
    document.getElementById('run-animation').addEventListener('click', function () {
        if (trajectoires.length === 0 || trajectoires[0].points.length === 0) {
            document.querySelector('.info').innerHTML = 'No trajectory available.';
            return;
        }

        // Réinitialiser l'animation
        animationTrajectoire.indexPointCourant = 0;
        animationTrajectoire.estEnCours = true;
        animationTrajectoire.dernierTemps = performance.now();

        // Placer la caméra au début de la trajectoire de référence
        if (trajReference && trajReference.points.length > 0) {
            cameraSmoothing.targetPosition.copy(trajReference.points[0]);
        }

        document.querySelector('.info').innerHTML = 'Playing animation...';
    });

    const curseurVitesse = document.getElementById('vitesse');
    curseurVitesse.addEventListener('input', function () {
        const valeur = parseInt(this.value);
        animationTrajectoire.vitesse = valeur;
        document.getElementById('vitesseValeur').textContent = valeur + ' points/s';
    });

    const curseurLissage = document.getElementById('lissage');
    curseurLissage.addEventListener('input', function () {
        const valeur = parseInt(this.value) / 100;
        cameraSmoothing.lerpFactor = valeur;
        document.getElementById('lissageValeur').textContent = valeur.toFixed(2);
    });
}


export function ajouterListeTrajectoires() {
    // Créer un conteneur pour la liste des trajectoires si pas déjà existant
    let listeContainer = document.getElementById('liste-trajectoires');
    if (!listeContainer) {
        listeContainer = document.createElement('div');
        listeContainer.id = 'liste-trajectoires';
        listeContainer.style.position = 'absolute';
        listeContainer.style.top = '10px';
        listeContainer.style.right = '10px';
        listeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        listeContainer.style.color = '#fff';
        listeContainer.style.padding = '10px';
        listeContainer.style.borderRadius = '5px';
        document.body.appendChild(listeContainer);
    }

    // Titre du panneau
    const titre = document.createElement('h3');
    titre.textContent = 'Trajectories';
    titre.style.margin = '0 0 10px 0';
    listeContainer.appendChild(titre);

    // Créer les options pour chaque trajectoire
    trajectoires.forEach((traj, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        
        // Case à cocher pour afficher/masquer
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `traj-${index}`;
        checkbox.checked = true; // Par défaut affiché
        checkbox.addEventListener('change', function() {
            traj.objets.points.visible = this.checked;
            traj.objets.ligne.visible = this.checked;
        });
        
        // Label avec couleur
        const label = document.createElement('label');
        label.htmlFor = `traj-${index}`;
        label.textContent = traj.nom;
        label.style.marginLeft = '5px';
        label.style.color = `#${traj.couleur.getHexString()}`;
        label.style.fontWeight = 'bold';
        
        // Ajouter radio pour définir la trajectoire de référence (seulement si pas déjà la référence)
        if (index > 0) {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'reference';
            radio.id = `ref-${index}`;
            radio.style.marginLeft = '10px';
            
            const labelRadio = document.createElement('label');
            labelRadio.htmlFor = `ref-${index}`;
            labelRadio.textContent = "Reference";
            labelRadio.style.marginLeft = '5px';
            
            radio.addEventListener('change', function() {
                if (this.checked) {
                    trajReference = trajectoires[index];
                    animationTrajectoire.trajectoirePoints = trajReference.points;
                    document.querySelector('.info').innerHTML = `Trajectoire de référence: ${traj.nom}`;
                }
            });
            
            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(radio);
            div.appendChild(labelRadio);
        } else {
            // Pour la première trajectoire (déjà référence par défaut)
            const spanRef = document.createElement('span');
            spanRef.textContent = " (Reference)";
            spanRef.style.marginLeft = '10px';
            
            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(spanRef);
        }
        
        listeContainer.appendChild(div);
    });
}

// Fonction pour démarrer l'animation
function demarrerAnimation() {
    animationTrajectoire.estEnCours = true;
    animationTrajectoire.indexPointCourant = 0;
    animationTrajectoire.dernierTemps = performance.now();
    document.querySelector('.info').innerHTML = 'Animation en cours...';
}

// Fonction pour arrêter l'animation
function arreterAnimation() {
    animationTrajectoire.estEnCours = false;
    document.querySelector('.info').innerHTML = 'Animation arrêtée';
}

// Modifiez le gestionnaire d'événements pour le bouton d'animation
document.getElementById('run-animation').addEventListener('click', function() {
    if (animationTrajectoire.estEnCours) {
        arreterAnimation();
        this.textContent = 'Run';
    } else {
        demarrerAnimation();
        this.textContent = 'Stop';
    }
});



// Dans votre fichier principal ou là où vous gérez l'interaction
function visualizeLidarProjections() {
    if (!pointCloud || !cameraFrustum) return;
    
    // Récupérer les positions des points LIDAR
    const positions = pointCloud.geometry.attributes.position.array;
    const numPoints = positions.length / 3;
    
    // Sélectionner un sous-ensemble de points LIDAR (par exemple, tous les N points)
    const selectedPoints = [];
    const samplingRate = 100; // Un point sur 100
    const maxDistance = 20; // Maximum 20 mètres de distance
    const cameraPosition = cameraFrustum.frustumBase.position.clone();
    
    for (let i = 0; i < numPoints; i += samplingRate) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        // Calculer la distance à la caméra
        const distance = new THREE.Vector3(x, y, z).distanceTo(cameraPosition);
        
        // Si le point est assez proche
        if (distance < maxDistance) {
            selectedPoints.push({ x, y, z });
        }
    }
    
    // Visualiser les projections
    cameraFrustum.visualizePointProjections(selectedPoints, {
        pointSize: 0.05,
        pointColor: 0xff00ff,
        drawLines: true,
        lineColor: 0xffff00,
        lineOpacity: 0.3
    });
}

// Ajouter un bouton pour activer la visualisation
document.getElementById('gui-button-container').innerHTML += `
    <div class="gui-row">
        <button id="visualize-projections">Show LIDAR Projections</button>
    </div>
`;

document.getElementById('visualize-projections').addEventListener('click', visualizeLidarProjections);




init();

