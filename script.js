// Configuration
// Configuration des mots animés et des paramètres de typage
const CONFIG = {
    words: ['découvrir', 'apprendre', 'progresser', 'voici mon stage'],
    typeSpeed: 120, // Vitesse de frappe en millisecondes
    deleteSpeed: 60, // Vitesse de suppression en millisecondes
    pauseAfterWord: 300, // Pause après chaque mot
    pauseAfterSnap: 1000, // Pause après le claquement de doigts
    finalPause: 1500 // Pause finale
};



// Audio management
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = [];
        this.currentSoundIndex = 0;
        this.isAudioEnabled = false;
        this.fingerSnapSound = null;
        this.loadSounds();
    }

    async loadSounds() {
        try {
            // Chargement du son finger-snap
            try {
                this.fingerSnapSound = new Audio('sounds/finger-snap.mp3');
                this.fingerSnapSound.preload = 'auto';
                this.fingerSnapSound.volume = 0.8;

            } catch (error) {
                // Échec du chargement de finger-snap.mp3
            }

            // Tentative de chargement des vrais sons de clavier
            const soundFiles = ['sounds/press-1.mp3', 'sounds/press-2.mp3', 'sounds/press-3.mp3'];
            
            for (const file of soundFiles) {
                try {
                    const audio = new Audio(file);
                    audio.preload = 'auto';
                    audio.volume = 0.3;
                    this.sounds.push(audio);
                } catch (error) {
                    // Fichier non trouvé, utilisation des sons synthétiques
                }
            }

            // Si les vrais sons ne se chargent pas, création de sons synthétiques
            if (this.sounds.length === 0) {
                await this.createSyntheticSounds();
            }

            this.isAudioEnabled = true;
        } catch (error) {
            // Initialisation audio échouée
        }
    }

    async createSyntheticSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Création de différents sons synthétiques de clavier
            const frequencies = [800, 900, 1000];
            
            for (const freq of frequencies) {
                const buffer = this.createKeyboardSound(freq);
                this.sounds.push(buffer);
            }
        } catch (error) {
            // Échec de la création des sons synthétiques
        }
    }

    createKeyboardSound(frequency) {
        const duration = 0.1;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 10);
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.1;
        }

        return buffer;
    }

    async playKeySound() {
        if (!this.isAudioEnabled || this.sounds.length === 0) return;

        try {
            const sound = this.sounds[this.currentSoundIndex];
            
            if (sound instanceof AudioBuffer) {
                // Son synthétique
                const source = this.audioContext.createBufferSource();
                source.buffer = sound;
                source.connect(this.audioContext.destination);
                source.start();
            } else {
                // Fichier audio réel
                const audioClone = sound.cloneNode();
                audioClone.currentTime = 0;
                await audioClone.play();
            }

            this.currentSoundIndex = (this.currentSoundIndex + 1) % this.sounds.length;
        } catch (error) {
            // Échec de la reproduction du son
        }
    }

    async playFingerSnap() {
        if (!this.fingerSnapSound) return;

        try {
            this.fingerSnapSound.currentTime = 0;
            await this.fingerSnapSound.play();
        } catch (error) {
            // Erreur de reproduction du finger-snap
        }
    }

    async enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.isAudioEnabled = true;
    }
}

// Typing animation
class TypingAnimation {
    constructor(audioManager, audioVisualizer) {
        this.audioManager = audioManager;
        this.audioVisualizer = audioVisualizer;
        this.textElement = document.getElementById('typing-text');
        this.cursorElement = document.getElementById('cursor');
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.isComplete = false;
    }

    async start() {
        await this.audioManager.enableAudio();
        this.animate();
    }

    async animate() {
        if (this.isComplete) return;

        const currentWord = CONFIG.words[this.currentWordIndex];
        
        if (!this.isDeleting) {
            // Imprimons
            if (this.currentCharIndex < currentWord.length) {
                this.textElement.textContent = currentWord.substring(0, this.currentCharIndex + 1);
                this.currentCharIndex++;
                await this.audioManager.playKeySound();
                setTimeout(() => this.animate(), CONFIG.typeSpeed);
            } else {
                // Mot terminé
                if (this.currentWordIndex === CONFIG.words.length - 1) {
                    // Dernier mot - terminons
                    this.complete();
                    return;
                } else {
                    // Pause après la fin du mot pour l'effet cinématographique
                    setTimeout(() => {
                        // Commencement de la suppression
                        this.isDeleting = true;
                        this.animate();
                    }, CONFIG.pauseAfterWord);
                }
            }
        } else {
            // Supprimons
            if (this.currentCharIndex > 0) {
                this.textElement.textContent = currentWord.substring(0, this.currentCharIndex - 1);
                this.currentCharIndex--;
                setTimeout(() => this.animate(), CONFIG.deleteSpeed);
            } else {
                // Mot supprimé, passage au suivant
                this.isDeleting = false;
                this.currentWordIndex++;
                setTimeout(() => this.animate(), 200);
            }
        }
    }



    async complete() {
        this.isComplete = true;
        
        // Attente de 1 seconde après la fin de la saisie
        setTimeout(async () => {
            // Jouons le finger-snap
            await this.audioManager.playFingerSnap();
            
            // Modification des styles pour l'effet final
            this.textElement.style.color = '#000000';
            this.cursorElement.style.display = 'none';
            
            // Changement du fond en blanc
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.style.background = '#ffffff';
            
            setTimeout(() => {
                this.transitionToMainScreen();
            }, CONFIG.pauseAfterSnap);
        }, 1000); // Pause de 1 seconde avant le finger-snap
    }

    transitionToMainScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const mainScreen = document.getElementById('main-screen');
        
        // Création d'un fond s'assombrissant dynamiquement selon l'approche du texte
        const darkeningOverlay = document.createElement('div');
        darkeningOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000000;
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        document.body.appendChild(darkeningOverlay);
        
        // Démarrage du fonçage précoce et dynamique synchronisé avec l'approche du texte
        setTimeout(() => {
            darkeningOverlay.style.opacity = '0.2'; // Légère obscurcissement
        }, 50);
        
        setTimeout(() => {
            darkeningOverlay.style.opacity = '0.5'; // Obscurcissement notable
        }, 150);
        
        setTimeout(() => {
            darkeningOverlay.style.opacity = '0.75'; // Obscurcissement intense
        }, 250);
        
        setTimeout(() => {
            darkeningOverlay.style.opacity = '0.9'; // Presque noir
        }, 350);
        
        setTimeout(() => {
            darkeningOverlay.style.opacity = '1'; // Complètement noir
        }, 450);
        
        // Cachage rapide du curseur
        this.cursorElement.style.display = 'none';
        
        // Création d'un effet de vol vers l'utilisateur - grossissement puissant
        this.textElement.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.textElement.style.transform = 'scale(6)';
        
        // Remplacement par un élément animé quand le fond est suffisamment sombre
        setTimeout(() => {
            // Cachage du texte original
            this.textElement.style.display = 'none';
            
            // Création d'un élément pour l'animation de vol du texte
            const transitionElement = document.createElement('div');
            
            // Application de tous les styles en une fois pour éviter le clignotement
            transitionElement.textContent = 'live4code';
            transitionElement.style.cssText = `
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) scale(6) !important;
                font-family: 'Montserrat', sans-serif !important;
                font-weight: 400 !important;
                font-size: clamp(3rem, 8vw, 6rem) !important;
                color: #000000 !important;
                z-index: 10000 !important;
                pointer-events: none !important;
                white-space: nowrap !important;
                will-change: transform, opacity, text-shadow !important;
                backface-visibility: hidden !important;
                transform-style: preserve-3d !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                text-shadow: none !important;
            `;
            document.body.appendChild(transitionElement);
            
            // Forçage du démarrage de l'animation avec un petit délai
            setTimeout(() => {
                transitionElement.style.animation = 'flyToUserText 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important';
            }, 50);
            
            // Suppression de l'élément juste après la fin de l'animation
            setTimeout(() => {
                if (transitionElement && transitionElement.parentNode) {
                    transitionElement.parentNode.removeChild(transitionElement);
                }
            }, 1850); // Exactement selon le temps de l'animation
        }, 500);
        
        setTimeout(() => {
            // Forçage de la suppression de tous les éléments d'animation avant l'affichage de l'écran principal
            const remainingElements = document.querySelectorAll('[style*="flyToUserText"]');
            remainingElements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            
            // Удаляем только временные анимационные элементы с текстом "live4code"
            const animationElements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent === 'live4code' && 
                el !== this.textElement && 
                (el.style.position === 'fixed' || el.style.animation.includes('flyToUserText'))
            );
            animationElements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            
            this.createLightRings();
            
            loadingScreen.style.display = 'none';
            mainScreen.classList.add('active');
            
            setTimeout(() => {
                if (darkeningOverlay.parentNode) {
                    darkeningOverlay.style.transition = 'opacity 0.5s ease-out';
                    darkeningOverlay.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (darkeningOverlay.parentNode) {
                            darkeningOverlay.parentNode.removeChild(darkeningOverlay);
                        }
                    }, 500);
                }
            }, 200);
            
            this.initMainScreenAnimations();
        }, 500); 
    }

    initMainScreenAnimations() {
        if (window.app && window.app.starfieldManager) {
            window.app.starfieldManager.destroy();
        }
        window.app.starfieldManager = new StarfieldManager();
        
        if (window.app && window.app.githubManager) {
            window.app.githubManager.init();
        }
        
        this.cubeController = new CubeController(this.audioVisualizer);
        
        this.showMobileHintIfNeeded();
        
        setTimeout(() => {
            const cubeElement = document.getElementById('cube');
            const musicBtn = document.getElementById('music-toggle');
            
            if (cubeElement && this.audioVisualizer) {
                this.audioVisualizer.startVisualization(cubeElement);
                
                if (musicBtn) {
                    musicBtn.classList.add('playing');
                    musicBtn.title = 'Выключить музыку';
                }
            }
        }, 1000);
    }
    
    createLightRings() {
        const ringsContainer = document.createElement('div');
        ringsContainer.className = 'light-rings-container';
        ringsContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(ringsContainer);
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'light-ring';
                ring.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 10px;
                    height: 10px;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    animation: expandRing 1.5s ease-out forwards;
                    box-shadow: 0 0 20px rgba(255, 255, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3);
                `;
                ringsContainer.appendChild(ring);
                
                setTimeout(() => {
                    if (ring.parentNode) {
                        ring.parentNode.removeChild(ring);
                    }
                }, 1500);
            }, i * 200);
        }
        
        setTimeout(() => {
            if (ringsContainer.parentNode) {
                ringsContainer.parentNode.removeChild(ringsContainer);
            }
        }, 3000);
    }

    showMobileHintIfNeeded() {
        const mobileHint = document.getElementById('mobile-hint');
        if (mobileHint) {
            mobileHint.style.display = 'none';
        }
    }
}

// Page visibility handling
class VisibilityManager {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Mettre en pause les animations lorsque l'onglet n'est pas visible
                document.body.style.animationPlayState = 'paused';
            } else {
                // Réactiver les animations lorsque l'onglet devient visible
                document.body.style.animationPlayState = 'running';
            }
        });
    }
}

// Contrôleur du Cube 3D - Vue interne
class CubeController {
    constructor(audioVisualizer = null) {
        this.cube = document.getElementById('cube');
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.faces = document.querySelectorAll('.cube-face');
        this.currentFace = 'front';
        this.audioVisualizer = audioVisualizer;
        
        this.init();
    }
    
    init() {
        this.cube.classList.add('show-front');
        
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                if (target) {
                    this.rotateTo(target);
                }
            });
        });
        
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle && this.audioVisualizer) {
            musicToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMusic();
            });
        }
        
        this.initTouchControls();
        
        // Ajout des gestionnaires d'événements pour les faces du cube - uniquement pour les faces visibles
        this.faces.forEach(face => {
            face.addEventListener('click', (e) => {
                e.stopPropagation();
                const faceType = face.getAttribute('data-face');
                
                // Détermine les faces adjacentes pour la position actuelle
                const adjacentFaces = this.getAdjacentFaces(this.currentFace);
                
                // Pivoter uniquement vers les faces adjacentes
                if (adjacentFaces.includes(faceType)) {
                    this.rotateTo(faceType);
                }
            });
            
            // Ajout d'une indication visuelle pour les faces cliquables
            face.addEventListener('mouseenter', (e) => {
                const faceType = face.getAttribute('data-face');
                const adjacentFaces = this.getAdjacentFaces(this.currentFace);
                
                if (adjacentFaces.includes(faceType)) {
                    face.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    face.style.cursor = 'pointer';
                } else {
                    face.style.cursor = 'default';
                }
            });
            
            face.addEventListener('mouseleave', (e) => {
                face.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            });
        });
        
        // Navigation au clavier désactivée
        
        // Ajout des indications pour l'utilisateur
        this.showNavigationHints();
    }
    
    getAdjacentFaces(currentFace) {
        // Détermine quelles faces sont visibles et cliquables à partir de la position actuelle
        const adjacencyMap = {
            'front': ['right', 'left', 'top', 'bottom'],
            'right': ['front', 'back', 'top', 'bottom'],
            'back': ['right', 'left', 'top', 'bottom'],
            'left': ['front', 'back', 'top', 'bottom'],
            'top': ['front', 'right', 'back', 'left'],
            'bottom': ['front', 'right', 'back', 'left']
        };
        
        return adjacencyMap[currentFace] || [];
    }
    
    rotateTo(face) {
        if (this.currentFace === face) return;
        

        
        this.cube.classList.remove(
            'show-front', 'show-right', 'show-back', 
            'show-left', 'show-top', 'show-bottom'
        );
        
        this.cube.classList.add(`show-${face}`);
        

        
        this.updateActiveButton(face);
        
        this.currentFace = face;
        
        this.playRotationSound();
        
        this.updateNavigationHints();
    }
    
    updateActiveButton(face) {
        this.navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-target') === face) {
                btn.classList.add('active');
            }
        });
    }
    
    handleKeyNavigation(e) {
    }
    
    playRotationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
        }
    }
    
    showNavigationHints() {
        const hint = document.createElement('div');
        hint.className = 'navigation-hint';
        hint.innerHTML = `
            <div class="hint-content">
                <h3>Navigation du cube</h3>
                <p>• Cliquez sur les faces visibles</p>
                <p>• Utilisez les boutons de navigation à droite</p>
            </div>
        `;
        
        document.body.appendChild(hint);
        
        setTimeout(() => {
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 500);
        }, 5000);
        
        hint.addEventListener('click', () => {
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 500);
        });
    }
    
    updateNavigationHints() {
        const adjacentFaces = this.getAdjacentFaces(this.currentFace);
        
        this.faces.forEach(face => {
            const faceType = face.getAttribute('data-face');
            if (adjacentFaces.includes(faceType)) {
                face.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            } else {
                face.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }
        });
    }
    
    toggleMusic() {
        if (!this.audioVisualizer) return;
        
        const musicBtn = document.getElementById('music-toggle');
        const icon = musicBtn.querySelector('i');
        
        if (this.audioVisualizer.isPlaying) {
            this.audioVisualizer.stopVisualization();
            musicBtn.classList.remove('playing');
            icon.className = 'fas fa-volume-mute';
            musicBtn.title = 'Включить музыку';
        } else {
            this.audioVisualizer.startVisualization(this.cube);
            musicBtn.classList.add('playing');
            icon.className = 'fas fa-volume-up';
            musicBtn.title = 'Выключить музыку';
        }
    }
    
    startDemo() {
        const faces = ['front', 'right', 'back', 'left', 'top', 'bottom'];
        let currentIndex = 0;
        
        const demoInterval = setInterval(() => {
            this.rotateTo(faces[currentIndex]);
            currentIndex = (currentIndex + 1) % faces.length;
            
            if (currentIndex === 0) {
                clearInterval(demoInterval);
            }
        }, 3000);
    }
    
    initTouchControls() {
    }
}

class MobileSlider {
    constructor() {
        this.currentSlide = 0;
        this.totalSlides = 6;
        this.isAnimating = false;
        
        this.container = document.getElementById('mobile-slider');
        this.slidesWrapper = document.getElementById('mobile-slides-wrapper');
        this.prevBtn = document.getElementById('mobile-prev-btn');
        this.nextBtn = document.getElementById('mobile-next-btn');
        this.indicators = document.querySelectorAll('.mobile-slide-indicator');
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.setupEventListeners();
        this.updateSlide(0, false);
    }
    
    setupEventListeners() {
        // Boutons de navigation
        this.prevBtn?.addEventListener('click', () => this.prevSlide());
        this.nextBtn?.addEventListener('click', () => this.nextSlide());
        
        // Indicateurs
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Navigation au clavier désactivée
        
        // Événements touch pour les swipes (uniquement sur les sliders mobiles)
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        if (!this.container) return;
        
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let isVerticalScroll = false;
        
        this.container.addEventListener('touchstart', (e) => {
            if (!this.isMobileMode()) return;
            
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = true;
            isVerticalScroll = false;
        }, { passive: true });
        
        this.container.addEventListener('touchmove', (e) => {
            if (!this.isMobileMode() || !isDragging) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = Math.abs(currentX - startX);
            const deltaY = Math.abs(currentY - startY);
            
            if (deltaY > deltaX && deltaY > 10) {
                isVerticalScroll = true;
            }
        }, { passive: true });
        
        this.container.addEventListener('touchend', (e) => {
            if (!this.isMobileMode() || !isDragging || isVerticalScroll) {
                isDragging = false;
                return;
            }
            
            const endX = e.changedTouches[0].clientX;
            const deltaX = endX - startX;
            const threshold = 50;
            
            if (Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    this.prevSlide();
                } else {
                    this.nextSlide();
                }
            }
            
            isDragging = false;
        }, { passive: true });
    }
    

    
    handleKeyNavigation(e) {
       
    }
    
    prevSlide() {
        if (this.isAnimating) return;
        
        const newSlide = this.currentSlide === 0 ? this.totalSlides - 1 : this.currentSlide - 1;
        this.goToSlide(newSlide);
    }
    
    nextSlide() {
        if (this.isAnimating) return;
        
        const newSlide = this.currentSlide === this.totalSlides - 1 ? 0 : this.currentSlide + 1;
        this.goToSlide(newSlide);
    }
    
    goToSlide(slideIndex) {
        if (this.isAnimating || slideIndex === this.currentSlide) return;
        
        this.updateSlide(slideIndex, true);
    }
    
    updateSlide(slideIndex, animate = true) {
        if (animate) {
            this.isAnimating = true;
        }
        
        this.currentSlide = slideIndex;
        
        const translateX = -slideIndex * 100; 
        this.slidesWrapper.style.transform = `translateX(${translateX}vw)`;
        
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === slideIndex);
        });
        
        this.triggerHapticFeedback();
        
        if (animate) {
            setTimeout(() => {
                this.isAnimating = false;
            }, 400);
        }
    }
    
    triggerHapticFeedback() {
        if ('vibrate' in navigator) {
            navigator.vibrate(10); 
        }
    }
    
    isMobileMode() {
        return window.innerWidth <= 768;
    }
}

class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.backgroundMusic = null;
        this.isPlaying = false;
        this.animationId = null;
        this.cubeElement = null;
        this.faces = null;
        this.isLocalFile = false;
        this.simpleMode = false; 
        
        this.init();
    }
    
    async init() {
        try {
            this.isLocalFile = window.location.protocol === 'file:';
    
            
            this.backgroundMusic = new Audio('sounds/background.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = 0.3;
            this.backgroundMusic.preload = 'auto';
            
            this.backgroundMusic.addEventListener('loadeddata', () => {

            });
            
            this.backgroundMusic.addEventListener('error', (e) => {
                console.error('Background music loading error:', e);
            });
            
            this.backgroundMusic.addEventListener('canplaythrough', () => {

            });
            

            
            if (!this.isLocalFile) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.analyser = this.audioContext.createAnalyser();
                    
                    this.analyser.fftSize = 256;
                    this.analyser.smoothingTimeConstant = 0.8;  
                    
                    const bufferLength = this.analyser.frequencyBinCount;
                    this.dataArray = new Uint8Array(bufferLength);
                    
                    
                    const source = this.audioContext.createMediaElementSource(this.backgroundMusic);
                    source.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);
                    
    
                } catch (audioError) {
                    console.warn('Web Audio API failed, using simple mode:', audioError);
                    this.simpleMode = true;
                }
            } else {

                this.simpleMode = true;
            }
            

            
        } catch (error) {
            console.error('Audio visualizer initialization failed:', error);
            this.simpleMode = true;
        }
    }
    
    async startVisualization(cubeElement) {

        
        if (!this.backgroundMusic) {
            console.error('Background music not ready');
            return;
        }
        
        this.cubeElement = cubeElement;
        this.faces = cubeElement.querySelectorAll('.cube-face');
        
        try {
            if (this.audioContext && this.audioContext.state === 'suspended') {

                await this.audioContext.resume();
            }
            
            if (this.audioContext) {
    
            }
            
            this.backgroundMusic.volume = 0;

            await this.backgroundMusic.play();
            this.fadeInMusic();
            
            this.isPlaying = true;
            
            this.animate();
            

            
        } catch (error) {
            console.error('Failed to start audio visualization:', error);
        }
    }
    
    fadeInMusic() {
        const targetVolume = 0.25; 
        const fadeStep = 0.01;
        const fadeInterval = 100;
        
        const fadeIn = setInterval(() => {
            if (this.backgroundMusic.volume < targetVolume) {
                this.backgroundMusic.volume = Math.min(
                    this.backgroundMusic.volume + fadeStep, 
                    targetVolume
                );
            } else {
                clearInterval(fadeIn);
            }
        }, fadeInterval);
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    getAverageFrequency(startIndex, endIndex) {
        let sum = 0;
        for (let i = startIndex; i < endIndex && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / (endIndex - startIndex);
    }
    
    applySubtleEffects(bass, mid, high) {
        
        return;
    }
    
    stopVisualization() {
        this.isPlaying = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
        
        
    }
    
    setVolume(volume) {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    toggle() {
        if (!this.backgroundMusic) return;
        
        if (this.isPlaying) {
            this.stopVisualization();
        } else {
            this.startVisualization(this.cubeElement);
        }
    }
}

// Starfield Manager
class StarfieldManager {
    constructor() {
        this.starfield = document.getElementById('starfield');
        this.shootingStars = document.getElementById('shooting-stars');
        this.spaceParticles = document.getElementById('space-particles');
        this.asteroids = document.getElementById('asteroids');
        this.stars = [];
        this.shootingStarInterval = null;
        this.particleInterval = null;
        this.asteroidInterval = null;
        
        this.isMobile = this.detectMobile();
        this.isLowPerformance = this.detectLowPerformance();
        
        this.init();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    detectLowPerformance() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return true;
        
        return navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    }

    init() {
        
        this.startShootingStars();
        this.startSpaceParticles();
        this.startAsteroids();
    }

    startShootingStars() {
        const starCount = this.isLowPerformance ? 2 : this.isMobile ? 3 : 5;
        const interval = this.isLowPerformance ? 2000 : this.isMobile ? 1500 : 1000;
        
        this.shootingStarInterval = setInterval(() => {
            for (let i = 0; i < starCount; i++) {
                setTimeout(() => {
                    this.createShootingStar();
                }, i * 150);
            }
        }, interval + Math.random() * 1500);
    }

    createShootingStar() {
        const shootingStar = document.createElement('div');
        
        const starType = Math.random();
        if (starType < 0.3) {
            shootingStar.className = 'shooting-star dense';
        } else if (starType < 0.7) {
            shootingStar.className = 'shooting-star';
        } else {
            shootingStar.className = 'shooting-star bright';
        }
        
        const tunnelRadius = Math.min(window.innerWidth, window.innerHeight) * 0.12; 
        const startAngle = Math.random() * Math.PI * 2;
        const startDistance = Math.random() * tunnelRadius;
        const startX = Math.cos(startAngle) * startDistance;
        const startY = Math.sin(startAngle) * startDistance;
        
        const endDistance = Math.min(window.innerWidth, window.innerHeight) * 0.6;
        const endX = Math.cos(startAngle) * endDistance;
        const endY = Math.sin(startAngle) * endDistance;
        
        const maxX = window.innerWidth / 2 - 50;
        const maxY = window.innerHeight / 2 - 50;
        const clampedEndX = Math.max(-maxX, Math.min(maxX, endX));
        const clampedEndY = Math.max(-maxY, Math.min(maxY, endY));
        
        shootingStar.style.setProperty('--start-x', startX + 'px');
        shootingStar.style.setProperty('--start-y', startY + 'px');
        shootingStar.style.setProperty('--end-x', clampedEndX + 'px');
        shootingStar.style.setProperty('--end-y', clampedEndY + 'px');
        
        
        shootingStar.style.animationDelay = Math.random() * 3 + 's';
        
        this.shootingStars.appendChild(shootingStar);
        
        const duration = shootingStar.classList.contains('dense') ? 6000 : 
                        shootingStar.classList.contains('bright') ? 3000 : 4000;
        setTimeout(() => {
            if (shootingStar.parentNode) {
                shootingStar.parentNode.removeChild(shootingStar);
            }
        }, duration + 1000);
     }

    startSpaceParticles() {
        const particleCount = this.isLowPerformance ? 4 : this.isMobile ? 8 : 12;
        const interval = this.isLowPerformance ? 1000 : this.isMobile ? 750 : 500;
        
        this.particleInterval = setInterval(() => {
            for (let i = 0; i < particleCount; i++) {
                setTimeout(() => {
                    this.createParticle();
                }, i * 60);
            }
        }, interval);
    }

    createParticle() {
        const particle = document.createElement('div');
        
        const particleType = Math.random();
        if (particleType < 0.3) {
            particle.className = 'particle fast';
        } else if (particleType < 0.7) {
            particle.className = 'particle';
        } else {
            particle.className = 'particle slow';
        }
        
        const tunnelRadius = Math.min(window.innerWidth, window.innerHeight) * 0.15; 
        const startAngle = Math.random() * Math.PI * 2;
        const startDistance = Math.random() * tunnelRadius;
        const startX = Math.cos(startAngle) * startDistance;
        const startY = Math.sin(startAngle) * startDistance;
        
        const endDistance = Math.min(window.innerWidth, window.innerHeight) * 0.8;
        const endX = Math.cos(startAngle) * endDistance;
        const endY = Math.sin(startAngle) * endDistance;
        
        const maxX = window.innerWidth / 2 - 50;
        const maxY = window.innerHeight / 2 - 50;
        const clampedEndX = Math.max(-maxX, Math.min(maxX, endX));
        const clampedEndY = Math.max(-maxY, Math.min(maxY, endY));
        
        particle.style.setProperty('--start-x', startX + 'px');
        particle.style.setProperty('--start-y', startY + 'px');
        particle.style.setProperty('--end-x', clampedEndX + 'px');
        particle.style.setProperty('--end-y', clampedEndY + 'px');
        
        particle.style.animationDelay = Math.random() * 4 + 's';
        
        this.spaceParticles.appendChild(particle);
        
        const duration = particle.classList.contains('fast') ? 8000 : 
                        particle.classList.contains('slow') ? 18000 : 12000;
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration + 2000);
    }

    startAsteroids() {
        const baseInterval = this.isLowPerformance ? 8000 : this.isMobile ? 6000 : 4000;
        const randomInterval = this.isLowPerformance ? 4000 : 6000;
        
        this.asteroidInterval = setInterval(() => {
            this.createAsteroid();
        }, baseInterval + Math.random() * randomInterval);
    }

    createAsteroid() {
        const asteroid = document.createElement('div');
        
        const sizeType = Math.random();
        if (sizeType < 0.5) {
            asteroid.className = 'asteroid small';
        } else if (sizeType < 0.8) {
            asteroid.className = 'asteroid medium';
        } else {
            asteroid.className = 'asteroid large';
        }
        
        if (Math.random() < 0.5) {
            asteroid.classList.add('right');
        }
        
        const offsetY = (Math.random() - 0.5) * 200;
        asteroid.style.setProperty('--offset-y', offsetY + 'px');
        
        asteroid.style.animationDelay = Math.random() * 4 + 's';
        
        const borderRadius = `${20 + Math.random() * 30}% ${40 + Math.random() * 40}% ${30 + Math.random() * 40}% ${20 + Math.random() * 30}%`;
        asteroid.style.borderRadius = borderRadius;
        
        this.asteroids.appendChild(asteroid);
        
        const duration = asteroid.classList.contains('small') ? 10000 : 
                        asteroid.classList.contains('medium') ? 14000 : 16000;
        setTimeout(() => {
            if (asteroid.parentNode) {
                asteroid.parentNode.removeChild(asteroid);
            }
        }, duration + 4000);
    }

    destroy() {
        if (this.shootingStarInterval) {
            clearInterval(this.shootingStarInterval);
        }
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
        if (this.asteroidInterval) {
            clearInterval(this.asteroidInterval);
        }
        
        this.shootingStars.innerHTML = '';
        this.spaceParticles.innerHTML = '';
        this.asteroids.innerHTML = '';
    }
}

class GitHubProjectsManager {
    constructor() {
        this.username = 'MrFrosas';
        this.projectsContainer = null;
        this.cache = null;
        this.cacheExpiry = 5 * 60 * 1000;
    }

    async init() {
        this.projectsContainer = document.getElementById('projects-content');
        this.mobileProjectsContainer = document.getElementById('mobile-projects-content');
        await this.loadProjects();
    }

    async loadProjects() {
        try {
            if (this.cache && Date.now() - this.cache.timestamp < this.cacheExpiry) {
                this.renderProjects(this.cache.data);
                return;
            }

            this.showLoading();
            
            const response = await fetch(`https://api.github.com/users/${this.username}/repos?sort=updated&per_page=100`);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const repos = await response.json();
            
            const topProjects = repos
                .filter(repo => !repo.fork && repo.stargazers_count >= 0)
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, 3);
            this.cache = {
                data: topProjects,
                timestamp: Date.now()
            };

            this.renderProjects(topProjects);

        } catch (error) {
            console.error('Erreur de chargement des projets:', error);
            this.showError();
        }
    }

    showLoading() {
        const loadingHTML = `
            <div class="projects-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Téléchargement des projets...</span>
            </div>
        `;
        
        if (this.projectsContainer) {
            this.projectsContainer.innerHTML = loadingHTML;
        }
        if (this.mobileProjectsContainer) {
            this.mobileProjectsContainer.innerHTML = loadingHTML;
        }
    }

    renderProjects(projects) {
        if (!this.projectsContainer && !this.mobileProjectsContainer) return;

        if (projects.length === 0) {
            this.showError('Проекты не найдены');
            return;
        }

        const projectsHTML = projects.map(project => {
            const language = project.language || 'Code';
            const description = project.description || 'Description non disponible';
            const stars = project.stargazers_count;
            
            return `
                <div class="project-item" onclick="window.open('${project.html_url}', '_blank')">
                    <div class="project-language">${language}</div>
                    <h3>
                        <i class="fab fa-github"></i>
                        ${project.name}
                    </h3>
                    <p>${description}</p>
                    <div class="project-stars">
                        <i class="fas fa-star"></i>
                        <span>${stars}</span>
                    </div>
                </div>
            `;
        }).join('');

        const githubLinkHTML = `
            <div class="github-link" onclick="window.open('https://github.com/${this.username}', '_blank')">
                <i class="fab fa-github"></i>
                <span>Tous les projets sur GitHub</span>
            </div>
        `;

        const fullHTML = projectsHTML + githubLinkHTML;
        
        if (this.projectsContainer) {
            this.projectsContainer.innerHTML = fullHTML;
        }
        if (this.mobileProjectsContainer) {
            this.mobileProjectsContainer.innerHTML = fullHTML;
        }
    }

    showError(message = 'Impossible de charger les projets') {
        const errorHTML = `
            <div class="projects-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="retry-btn" onclick="window.app.githubManager.loadProjects()">
                    Попробовать снова
                </button>
            </div>
        `;
        
        if (this.projectsContainer) {
            this.projectsContainer.innerHTML = errorHTML;
        }
        if (this.mobileProjectsContainer) {
            this.mobileProjectsContainer.innerHTML = errorHTML;
        }
    }

    async refresh() {
        this.cache = null;
        await this.loadProjects();
    }
}

// Safari Warning Manager
class SafariWarningManager {
    constructor() {
        this.warningElement = null;
        this.closeButton = null;
        this.storageKey = 'safari-warning-dismissed';
        this.init();
    }

    init() {
        if (!this.isSafari()) {
            return;
        }
        if (this.isDismissed()) {
            return;
        }

        this.setupElements();
        this.showWarning();
    }

    isSafari() {
        const userAgent = navigator.userAgent.toLowerCase();
        const vendor = navigator.vendor?.toLowerCase() || '';
        
        return (
            vendor.includes('apple') &&
            userAgent.includes('safari') &&
            !userAgent.includes('chrome') &&
            !userAgent.includes('chromium') &&
            !userAgent.includes('edg') &&
            !userAgent.includes('firefox')
        );
    }

    isDismissed() {
        try {
            return localStorage.getItem(this.storageKey) === 'true';
        } catch (e) {
            return false;
        }
    }

    setupElements() {
        this.warningElement = document.getElementById('safari-warning');
        this.closeButton = document.getElementById('safari-warning-close');

        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.dismissWarning());
        }

        setTimeout(() => {
            if (this.warningElement && !this.warningElement.classList.contains('hidden')) {
                this.dismissWarning();
            }
        }, 10000);
    }

    showWarning() {
        if (this.warningElement) {
            this.warningElement.classList.remove('hidden');
        }
    }

    dismissWarning() {
        if (this.warningElement) {
            this.warningElement.classList.add('hidden');
            
            try {
                localStorage.setItem(this.storageKey, 'true');
            } catch (e) {
            }
        }
    }
}

// Initialize application
class App {
    constructor() {
        this.audioManager = new AudioManager();
        this.audioVisualizer = new AudioVisualizer();
        this.typingAnimation = new TypingAnimation(this.audioManager, this.audioVisualizer);
        this.visibilityManager = new VisibilityManager();
        this.starfieldManager = null;
        this.githubManager = new GitHubProjectsManager();
        this.mobileSlider = new MobileSlider();
        this.safariWarning = new SafariWarningManager();
        
        this.init();
    }

    init() {
        // Wait for DOM and start typing animation
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const startPrompt = document.getElementById('start-prompt');
        const typingContainer = document.getElementById('typing-container');
        

        
        if (startPrompt) {
            startPrompt.addEventListener('click', async () => {
                // Hide prompt and show typing container
                startPrompt.style.display = 'none';
                typingContainer.style.display = 'flex';
                
                // Small delay for smoothness
                setTimeout(() => {
                    this.typingAnimation.start();
                }, 300);
            });
        } else {
            console.error('Start prompt not found!');
        }
    }
}

// Fonction pour télécharger le rapport PDF
function downloadPDF() {
    const pdfUrl = 'rapport-de-stage.pdf'; // URL vers votre fichier PDF
    window.open(pdfUrl, '_blank');
}

// Fonction pour gérer la rotation des compétences
function rotateToSkill(skillId) {
    // Cacher tous les détails
    const allDetails = document.querySelectorAll('.skill-details-item');
    allDetails.forEach(detail => detail.classList.remove('active'));
    
    // Afficher le détail correspondant
    const skillDetails = document.getElementById(`${skillId}-details`);
    if (skillDetails) {
        skillDetails.classList.add('active');
    }
    
    // Animer le conteneur de détails
    const container = document.getElementById('skill-details-container');
    if (container) {
        container.style.display = 'flex';
        setTimeout(() => {
            container.style.display = 'none';
        }, 3000); // Cache après 3 secondes
    }
}

// Fonction pour gérer l'affichage des détails des compétences
function showSkillDetails(skillId) {
    const skillDetails = document.getElementById(`${skillId}-details`);
    if (skillDetails) {
        skillDetails.classList.toggle('active');
    }
}

// Démarrage de l'application
window.app = new App(); 