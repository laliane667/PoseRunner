export class CameraFrustum {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.frustumBase = null;
        this.frustumObject = null;
        
        // Si les paramètres intrinsèques sont fournis, calculer le FOV à partir d'eux
        let fov = options.fov || 60;
        let aspect = options.aspect || 16/9;
        
        if (options.intrinsics) {
            // Paramètres intrinsèques sous forme de matrice K
            // K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]]
            const { fx, fy, cx, cy, width, height } = options.intrinsics;
            
            // Calculer le FOV vertical en degrés
            fov = 2 * Math.atan(height / (2 * fy)) * (180 / Math.PI);
            
            // Calculer le ratio d'aspect à partir des dimensions de l'image
            aspect = width / height;
            
            console.log(`Calculated FOV: ${fov}°, Aspect Ratio: ${aspect}`);
        }
        
        // Paramètres par défaut du frustum
        this.params = {
            fov: fov, // Field of view vertical en degrés
            aspect: aspect, // Ratio largeur/hauteur
            near: options.near || 0.1, // Plan proche
            far: options.far || 10, // Plan lointain
            color: options.color || 0x00ff00, // Couleur du frustum
            calibration: options.calibration || { x: 0, y: 0, z: 0 },
            rotation: options.rotation || { roll: 0, pitch: 0, yaw: 0 }
        };

        this.create();
    }

    create() {
        // Supprimer l'ancien frustum s'il existe
        if (this.frustumBase) {
            this.scene.remove(this.frustumBase);
        }
        this.frustumBase = new THREE.Group();
        this.frustumObject = new THREE.Group();
        this.frustumBase.add(this.frustumObject);
        
        
        // Calculer les dimensions du frustum
        const fovRad = this.params.fov * Math.PI / 180; // Convertir FOV en radians
        const nearHeight = 2 * Math.tan(fovRad / 2) * this.params.near;
        const nearWidth = nearHeight * this.params.aspect;
        const farHeight = 2 * Math.tan(fovRad / 2) * this.params.far;
        const farWidth = farHeight * this.params.aspect;
        
        // Créer un matériau pour les lignes
        const material = new THREE.LineBasicMaterial({ 
            color: this.params.color,
            transparent: true,
            opacity: 0.7
        });
        
        // Créer un matériau pour les plans (semi-transparent)
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: this.params.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        // Vertices pour les coins du frustum
        // Plan proche
        const nearTopLeft = new THREE.Vector3(-nearWidth/2, nearHeight/2, -this.params.near);
        const nearTopRight = new THREE.Vector3(nearWidth/2, nearHeight/2, -this.params.near);
        const nearBottomRight = new THREE.Vector3(nearWidth/2, -nearHeight/2, -this.params.near);
        const nearBottomLeft = new THREE.Vector3(-nearWidth/2, -nearHeight/2, -this.params.near);
        
        // Plan éloigné
        const farTopLeft = new THREE.Vector3(-farWidth/2, farHeight/2, -this.params.far);
        const farTopRight = new THREE.Vector3(farWidth/2, farHeight/2, -this.params.far);
        const farBottomRight = new THREE.Vector3(farWidth/2, -farHeight/2, -this.params.far);
        const farBottomLeft = new THREE.Vector3(-farWidth/2, -farHeight/2, -this.params.far);
        
        // Créer les lignes pour les arêtes du frustum
        const lines = [
            // Near plane
            [nearTopLeft, nearTopRight],
            [nearTopRight, nearBottomRight],
            [nearBottomRight, nearBottomLeft],
            [nearBottomLeft, nearTopLeft],
            
            // Far plane
            [farTopLeft, farTopRight],
            [farTopRight, farBottomRight],
            [farBottomRight, farBottomLeft],
            [farBottomLeft, farTopLeft],
            
            // Connecting lines
            [nearTopLeft, farTopLeft],
            [nearTopRight, farTopRight],
            [nearBottomRight, farBottomRight],
            [nearBottomLeft, farBottomLeft],
        ];
        
        // Ajouter les lignes au groupe
        lines.forEach(([start, end]) => {
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const line = new THREE.Line(geometry, material);
            this.frustumObject.add(line);
        });
        
        // Ajouter le plan proche (visualisation du plan image)
        const nearPlaneGeometry = new THREE.PlaneGeometry(nearWidth, nearHeight);
        const nearPlane = new THREE.Mesh(nearPlaneGeometry, planeMaterial);
        nearPlane.position.z = -this.params.near;
        this.frustumObject.add(nearPlane);
        
        // Ajouter le plan éloigné
        const farPlaneGeometry = new THREE.PlaneGeometry(farWidth, farHeight);
        const farPlane = new THREE.Mesh(farPlaneGeometry, planeMaterial);
        farPlane.position.z = -this.params.far;
        this.frustumObject.add(farPlane);
        
        this.frustumBase.position.set(
            this.params.calibration.x,
            this.params.calibration.y,
            this.params.calibration.z
        );
        

        const euler = new THREE.Euler(
            this.params.rotation.roll,
            this.params.rotation.pitch,
            this.params.rotation.yaw,
            'ZXY' // Ou 'YXZ' selon ta source
        );
        
        this.frustumObject.setRotationFromEuler(euler);
        
        
        // Ajouter le groupe à la scène
        this.scene.add(this.frustumBase);

        this.hide();
        return this.frustumBase;
    }
    
    update(position, rotation = null) {
        if (!this.frustumObject) return;
    
        if (rotation) {
            this.frustumBase.setRotationFromQuaternion(rotation);
        }
        
        this.frustumBase.position.copy(position || new THREE.Vector3());

    }
    
    setParams(params) {
        // Mettre à jour les paramètres
        this.params = { ...this.params, ...params };
        // Recréer le frustum avec les nouveaux paramètres
        this.create();
    }
    
    show() {
        if (this.frustumObject) {
            this.frustumObject.visible = true;
        }
    }
    
    hide() {
        if (this.frustumObject) {
            this.frustumObject.visible = false;
        }
    }
    
    dispose() {
        if (this.frustumObject) {
            // Nettoyer proprement les géométries et matériaux
            this.frustumObject.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            
            // Retirer de la scène
            this.scene.remove(this.frustumObject);
            this.frustumObject = null;
        }
    }

    projectPoint(point3D) {
        // Création d'un objet Vector3 pour le point 3D s'il ne l'est pas déjà
        const pt = (point3D instanceof THREE.Vector3) ? point3D : new THREE.Vector3(point3D.x, point3D.y, point3D.z);
        
        // Appliquer la transformation inverse pour passer du système global au système local de la caméra
        // D'abord, on crée un vecteur du point en coordonnées mondiales
        const worldPoint = pt.clone();
        
        // Créer une matrice de transformation inverse pour passer du monde à la caméra
        const invMatrix = new THREE.Matrix4();
        this.frustumBase.updateMatrixWorld(true);
        invMatrix.copy(this.frustumBase.matrixWorld).invert();
        
        const cameraPoint = worldPoint.applyMatrix4(invMatrix);

        // Si le point est derrière la caméra, il n'est pas visible
        if (cameraPoint.z > 0) {
            return null;
        }
        
        // Extraire les paramètres intrinsèques
        const { fx, fy, cx, cy } = this.params.intrinsics || { 
            fx: (this.params.near * Math.tan(this.params.fov * Math.PI / 360)) / (this.params.aspect * 0.5),
            fy: this.params.near * Math.tan(this.params.fov * Math.PI / 360),
            cx: 0,
            cy: 0
        };
        
        const x_2d = (-fx * cameraPoint.x / cameraPoint.z) + cx;
        const y_2d = (-fy * cameraPoint.y / cameraPoint.z) + cy;
        
        // Calculer les dimensions normalisées du plan image
        const nearWidth = 2 * Math.tan(this.params.fov * Math.PI / 360) * this.params.aspect * this.params.near;
        const nearHeight = 2 * Math.tan(this.params.fov * Math.PI / 360) * this.params.near;
        
        // Convertir les coordonnées normalisées en coordonnées sur le plan image
        const u = (x_2d + 1) * 0.5 * nearWidth - nearWidth / 2;
        const v = (y_2d + 1) * 0.5 * nearHeight - nearHeight / 2;
      

        
        // On renvoie les coordonnées dans le plan image ainsi que la profondeur (utile pour z-buffer)
        return { 
            u: u, 
            v: v, 
            depth: -cameraPoint.z,
            visible: true 
        };
    }
    visualizePointProjections(matchPoints, options = {}) {
        // Remove previous visualizations
        this.clearVisualizations();
        
        // Create a group to contain visualizations - directly added to the scene
        this.visualizationGroup = new THREE.Group();
        this.scene.add(this.visualizationGroup);
        
        // Default options
        const defaultOptions = {
            pointSize: 0.02,
            pointColor: 0xffff00,
            drawLines: true,
            lineColor: 0xffff00,
            lineOpacity: 0.5
        };
        
        const settings = { ...defaultOptions, ...options };
        
        // Create material for projected points
        const pointMaterial = new THREE.PointsMaterial({
            color: settings.pointColor,
            size: settings.pointSize
        });
        
        // Create material for lines
        const lineMaterial = new THREE.LineBasicMaterial({
            color: settings.lineColor,
            transparent: true,
            opacity: settings.lineOpacity
        });
        
        // Calculate dimensions of the near plane
        const fovRad = this.params.fov * Math.PI / 180;
    // Inverser l'aspect ratio pour compenser la rotation
    const correctedAspect = 1 / this.params.aspect;
    const nearHeight = 2 * Math.tan(fovRad / 2) * this.params.near;
    // Utiliser l'aspect corrigé
    const nearWidth = nearHeight * correctedAspect;
        
        // Get world matrix of the frustum for transforming points
        this.frustumBase.updateMatrixWorld(true);
        this.frustumObject.updateMatrixWorld(true);
        
        // For each match point
        matchPoints.forEach(point => {
            if (point.u !== undefined && point.v !== undefined) {
                // Get image dimensions from intrinsics
                const imageWidth = this.params.intrinsics ? this.params.intrinsics.width : 1242;
                const imageHeight = this.params.intrinsics ? this.params.intrinsics.height : 375;
                
                // Normaliser d'abord au format [-1, 1]
                // Note: Nous maintenons l'inversion de Y pour l'orientation de l'image
                let normalizedU = (point.u / imageWidth) * 2 - 1;
                let normalizedV = (point.v / imageHeight) * 2 - 1; // Changement ici: ne pas inverser Y
                
                // Appliquer une rotation de -π/2 aux coordonnées normalisées
                const tempU = normalizedU;
                normalizedU = -normalizedV; // Rotation de -π/2: x' = -y
                normalizedV = tempU;        // Rotation de -π/2: y' = x
                
                // Maintenant on inverse l'axe V pour corriger l'inversion haut/bas
                normalizedV = -normalizedV;
                
                // Appliquer l'échelle pour obtenir les coordonnées sur le plan near
                normalizedU *= (nearWidth / 2);
                normalizedV *= (nearHeight / 2);
                
                // Create a vector for the point on the near plane
                const nearPlanePoint = new THREE.Vector3(
                    normalizedU, 
                    normalizedV, 
                    -this.params.near
                );
                
                // Appliquer les transformations
                const localPoint = nearPlanePoint.clone();
                localPoint.applyMatrix4(this.frustumObject.matrixWorld);
                
                // Create a point for visualization on the image plane
                const pointGeometry = new THREE.BufferGeometry();
                pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                    localPoint.x, localPoint.y, localPoint.z
                ], 3));
                
                const pointMesh = new THREE.Points(pointGeometry, pointMaterial);
                this.visualizationGroup.add(pointMesh);
                
                // If we want to draw lines between 3D points and their projection
                if (settings.drawLines && point.x !== undefined) {
                    const lineGeometry = new THREE.BufferGeometry();
                    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                        point.x, point.y, point.z,
                        localPoint.x, localPoint.y, localPoint.z
                    ], 3));
                    
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    this.visualizationGroup.add(line);
                }
            }
        });
    }
    
    // Nettoyer les visualisations
    clearVisualizations() {
        if (this.visualizationGroup) {
            this.visualizationGroup.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            
            this.scene.remove(this.visualizationGroup);
            this.visualizationGroup = null;
        }
    }
}