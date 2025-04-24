import { pointSize, scene, pointCloud, camera, controls } from "./main.js";
import { setPointCloud } from "./main.js";
export function loadCustomPointCloud(fileURL, fileName) {

    // Supprimer l'ancien nuage de points s'il existe
    if (pointCloud) {
        scene.remove(pointCloud);
        pointCloud.geometry.dispose();
        pointCloud.material.dispose();
    }

    document.querySelector('.info').innerHTML = `Chargement de ${fileName}...`;

    const loader = new THREE.PCDLoader();
    loader.load(
        fileURL,
        function (points) {
            scene.add(points);
            setPointCloud(points);

            if (points.material) {
                points.material.size = pointSize;
                points.material.needsUpdate = true;
            }

            alert(`This point cloud contains ${points.geometry.attributes.position.count} points.`);
            // Ajuster la caméra pour voir l'ensemble du nuage
            const box = new THREE.Box3().setFromObject(points);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
            cameraZ *= 1.5; // Facteur pour avoir une marge

            /* camera.position.set(center.x, center.y, center.z + cameraZ);
            camera.lookAt(center);
            controls.target.copy(center); */

            document.querySelector('.info').innerHTML = `Nuage de points ${fileName} chargé`;

            // Révoquer l'URL pour libérer la mémoire
            URL.revokeObjectURL(fileURL);
        },
        function (xhr) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            document.querySelector('.info').innerHTML = 'Chargement: ' + Math.round(percentComplete) + '%';
        },
        function (error) {
            console.error('Erreur lors du chargement du fichier PCD:', error);
            document.querySelector('.info').innerHTML = `Erreur de chargement de ${fileName}`;
            URL.revokeObjectURL(fileURL);
        }
    );

}   
