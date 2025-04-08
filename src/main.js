import { chargerTrajectoire, genererTrajectoire, chargerTrajectoireCSV} from "./trajectory.js";


// Variables globales
let scene, camera, renderer, controls;
let pointCloud;
const pointSize = 0.05;
let pointsTrajectoire;
let pointsTrajectoireObj;

function init() {
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0);

    const canvas = document.getElementById("myCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    const gridHelper = new THREE.GridHelper(20, 20);
    //scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    loadPointCloud();

    chargerTrajectoireCSV()
    .then(points => {
      pointsTrajectoire = points;
      pointsTrajectoireObj = afficherTrajectoire(pointsTrajectoire);
      animationTrajectoire.trajectoirePoints = pointsTrajectoire;
      document.querySelector('.info').innerHTML += `<br>Trajectoire de ${points.length} points chargée`;
      ajouterBoutonDemarrer();
    })
    .catch(error => {
      console.error("Erreur lors du chargement de la trajectoire:", error);
      document.querySelector('.info').innerHTML += "<br>Erreur de chargement de la trajectoire";
      // Fallback : générer une trajectoire si le chargement échoue
      pointsTrajectoire = genererTrajectoire(800);
      pointsTrajectoireObj = afficherTrajectoire(pointsTrajectoire);
      animationTrajectoire.trajectoirePoints = pointsTrajectoire;
      ajouterBoutonDemarrer();
    });
    // Ajout d'une information sur la trajectoire

    window.addEventListener('resize', onWindowResize);
    animate();
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
        'data/map.pcd', // Chemin vers votre fichier PCD
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

            document.querySelector('.info').innerHTML = 'Nuage de points PCD chargé';
        },
        function (xhr) {
            // Progression du chargement
            const percentComplete = xhr.loaded / xhr.total * 100;
            document.querySelector('.info').innerHTML = 'Chargement: ' + Math.round(percentComplete) + '%';
        },
        function (error) {
            // Erreur de chargement
            console.error('Erreur lors du chargement du fichier PCD:', error);
            document.querySelector('.info').innerHTML = 'Erreur de chargement du PCD';

            // Utiliser le nuage de test en cas d'erreur
            createTestPointCloud();
        }
    );
}


let animationTrajectoire = {
    trajectoirePoints: [],
    pointsAffichés: [],
    indexPointCourant: 0,
    estEnCours: false,
    vitesse: 10, // Points par seconde
    dernierTemps: 0
};

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
    followOffset: new THREE.Vector3(0, 0, 50) // Décalage de la caméra par rapport au point
};

function mettreAJourAnimation(temps) {
    if (!animationTrajectoire.estEnCours) return;

    const tempsDelta = temps - animationTrajectoire.dernierTemps;
    const pointsParFrame = (animationTrajectoire.vitesse * tempsDelta) / 1000;

    if (pointsParFrame < 1) {
        updateCameraPosition();
        return;
    }

    animationTrajectoire.dernierTemps = temps;

    const nouveauxPoints = Math.floor(pointsParFrame);
    let pointsFinaux = animationTrajectoire.indexPointCourant + nouveauxPoints;

    if (pointsFinaux >= animationTrajectoire.trajectoirePoints.length) {
        pointsFinaux = animationTrajectoire.trajectoirePoints.length;
        animationTrajectoire.estEnCours = false; // Animation terminée
    }

    for (let i = animationTrajectoire.indexPointCourant; i < pointsFinaux; i++) {
        animationTrajectoire.pointsAffichés.push(animationTrajectoire.trajectoirePoints[i]);
    }

    animationTrajectoire.indexPointCourant = pointsFinaux;

    const geometriePoints = new THREE.BufferGeometry().setFromPoints(animationTrajectoire.pointsAffichés);
    pointsTrajectoireObj.points.geometry.dispose();
    pointsTrajectoireObj.points.geometry = geometriePoints;

    pointsTrajectoireObj.ligne.geometry.dispose();
    pointsTrajectoireObj.ligne.geometry = geometriePoints.clone();

    if (animationTrajectoire.pointsAffichés.length > 0) {
        const dernierPoint = animationTrajectoire.pointsAffichés[animationTrajectoire.pointsAffichés.length - 1];
        cameraSmoothing.targetPosition.copy(dernierPoint);
    }

}

function updateCameraPosition() {
    if (animationTrajectoire.pointsAffichés.length === 0) return;
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
        if (animationTrajectoire.trajectoirePoints.length === 0) {
            document.querySelector('.info').innerHTML = 'Pas de points de trajectoire disponibles';
            return;
        }

        animationTrajectoire.pointsAffichés = [];
        animationTrajectoire.indexPointCourant = 0;
        animationTrajectoire.estEnCours = true;
        animationTrajectoire.dernierTemps = performance.now();

        animationTrajectoire.pointsAffichés.push(animationTrajectoire.trajectoirePoints[0]);
        animationTrajectoire.indexPointCourant = 1;

        cameraSmoothing.targetPosition.copy(animationTrajectoire.trajectoirePoints[0]);

        document.querySelector('.info').innerHTML = 'Animation en cours...';
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

init();