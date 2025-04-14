import { importTrajectoryCSV, genererTrajectoire, chargerTrajectoireCSV, creerObjetsTrajectoire} from "./trajectory.js";
import { loadCustomPointCloud } from "./map.js";

export let trajectoires = []; // Tableau qui contiendra toutes les trajectoires
export let trajReference = null; // Référence vers la trajectoire de vérité (index 0)
// Variables globales
export let scene, camera, renderer, controls;
export let pointCloud;
export const pointSize = 0.05;

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

    loadPointCloud();

    // Chargement des trajectoires
    const fichiersPaths = [
        './example/GT_poses.csv',  // Trajectoire de vérité (référence)
        './example/poses.csv',
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
        'example/mini_map.pcd', // Chemin vers votre fichier PCD
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
let animationTrajectoire = {
    trajectoirePoints: [], // Points de la trajectoire de référence
    indexPointCourant: 0,
    estEnCours: false,
    vitesse: 10, // Points par seconde
    dernierTemps: 0
};

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
init();