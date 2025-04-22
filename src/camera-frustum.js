
export class CameraFrustum {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.frustumObject = null;

        // Paramètres par défaut du frustum
        this.params = {
            fov: options.fov || 60, // Field of view vertical en degrés
            aspect: options.aspect || 16/9, // Ratio largeur/hauteur
            near: options.near || 0.1, // Plan proche
            far: options.far || 10, // Plan lointain
            color: options.color || 0x00ff00, // Couleur du frustum
            calibration: options.calibration || { x: 0, y: 0, z: 0 } // Décalage/calibration extrinsèque
        };

        this.create();
    }

    create() {
        // Supprimer l'ancien frustum s'il existe
        if (this.frustumObject) {
            this.scene.remove(this.frustumObject);
        }

        // Créer un groupe pour contenir tous les éléments du frustum
        this.frustumObject = new THREE.Group();
        
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
            opacity: 0.1,
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
        
        // Appliquer la calibration extrinsèque (décalage)
        this.frustumObject.position.set(
            this.params.calibration.x,
            this.params.calibration.y,
            this.params.calibration.z
        );
        
        // Ajouter le groupe à la scène
        this.scene.add(this.frustumObject);
        
        return this.frustumObject;
    }
    
    update(position, rotation = null) {
        if (!this.frustumObject) return;
        
        // Créer une copie de la position pour ne pas modifier l'original
        const positionWithCalib = position ? position.clone() : new THREE.Vector3();
        
        // Appliquer d'abord la rotation au frustum
        if (rotation) {
            this.frustumObject.setRotationFromQuaternion(rotation);
        }
        
        // Puis calculer l'offset en tenant compte de la rotation
        const offset = new THREE.Vector3(
            this.params.calibration.x,
            this.params.calibration.y,
            this.params.calibration.z
        );
        
        // Si on a une rotation, appliquer l'offset dans le repère local du frustum
        if (rotation) {
            offset.applyQuaternion(rotation);
        }
        
        // Appliquer la position + offset calculé
        this.frustumObject.position.copy(positionWithCalib.add(offset));
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
}