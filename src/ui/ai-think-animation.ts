class ThinkingAnimator extends HTMLElement {
    private frames: { [key: string]: string[] } = {
        'thinking': [
            ` ___ 
(•••)
 o_o 
  -  `,
            ` ___ 
(•••)
 -_- 
  -  `,
            ` ___ 
(•••)
 ◔_◔
  -  `,
            ` ___ 
(•••)
 ◕_◕
  -  `,
            ` ___ 
(•••)
￣ω￣
  -  `
        ],
        'happy': [
            ` ___ 
(•••)
 ^_^ 
  -  `,
            ` ___ 
(•••)
 ◡_◡
  -  `,
            ` ___ 
(•••)
 ≧◡≦
  -  `,
            ` ___ 
(•••)
 ★_★
  -  `,
            ` ___ 
(•••)
 ♥_♥ 
  -  `
        ],
        'clever': [
            ` ___ 
(•••)
 >_> 
  -  `,
            ` ___ 
(•••)
 ᓚ_ᗢ
  -  `,
            ` ___ 
(•••)
 ¬_¬ 
  -  `,
            ` ___ 
(•••)
  シ
  -  `,
            ` ___ 
(•••)
 ✌_✌
  -  `
        ],
        'sad': [
            ` ___ 
(•••)
 T_T 
  -  `,
            ` ___ 
(•••)
 •_• 
  -  `,
            ` ___ 
(•••)
 ◔︿◔
  -  `,
            ` ___ 
(•••)
 ︶︿︶
  -  `
        ],
        'random': [
            ` ___ 
(•••)
 ^_^ 
  -  `,
            ` ___ 
(•••)
 o_o 
  -  `,
            ` ___ 
(•••)
 -_- 
  -  `,
            ` ___ 
(•••)
 ◕_◕
  -  `,
            ` ___ 
(•••)
 ᓚ_ᗢ
  -  `,
            ` ___ 
(•••)
 ★_★
  -  `,
            ` ___ 
(•••)
 ◡_◡
  -  `,
            ` ___ 
(•••)
 T_T 
  -  `,
            ` ___ 
(•••)
  シ
  -  `,
            ` ___ 
(•••)
 ≧◡≦
  -  `
        ]
    };
    
    private currentFrameIndex: number = 0;
    private intervalId: number | null = null;
    private animationContent: HTMLElement | null = null;
    private statusText: HTMLElement | null = null;
    private currentMode: string = 'thinking';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback(): void {
        this.render();
        this.startAnimation();
    }

    disconnectedCallback(): void {
        this.stopAnimation();
    }
    
    static get observedAttributes(): string[] {
        return ['speed', 'theme', 'mode'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        if ((name === 'speed' || name === 'mode') && oldValue !== newValue) {
            this.startAnimation();
        }
        if (name === 'theme' && this.animationContent) {
            this.updateTheme();
        }
    }

    private render(): void {
        if (!this.shadowRoot) return;
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    font-family: 'Courier New', Courier, monospace;
                    white-space: pre;
                    line-height: 1.2;
                    text-align: center;
                    font-size: 18px;
                    color: #00ff00;
                    filter: drop-shadow(0 0 3px currentColor);
                    vertical-align: middle;
                }
                
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    animation: subtle-pulse 2s ease-in-out infinite;
                }
                
                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    opacity: 0.8;
                }
                
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: currentColor;
                    animation: blink 1.5s infinite;
                }
                
                .animation-content {
                    text-align: center;
                    line-height: 1.3;
                }
                
                @keyframes subtle-pulse {
                    0%, 100% { opacity: 0.9; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-1px); }
                }
                
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
                
                /* Темы */
                :host([theme="dark"]) { color: #00ff88; }
                :host([theme="blue"]) { color: #66ccff; }
                :host([theme="purple"]) { color: #cc66ff; }
                :host([theme="terminal"]) { color: #00ff00; text-shadow: 0 0 5px #00ff00; }
                :host([theme="course"]) { color: #ff6b35; }
            </style>
            <div class="container">
                <div class="status-indicator">
                    <span class="status-dot"></span>
                    <span>${this.currentMode}</span>
                </div>
                <div class="animation-content"></div>
            </div>
        `;
        
        this.animationContent = this.shadowRoot.querySelector('.animation-content');
        this.statusText = this.shadowRoot.querySelector('.status-indicator span:last-child');
        this.updateTheme();
    }

    private updateTheme(): void {
        const theme = this.getAttribute('theme') || 'default';
        this.setAttribute('data-theme', theme);
    }

    private getCurrentFrames(): string[] {
        const mode = this.getAttribute('mode') || 'thinking';
        this.currentMode = mode;
        return this.frames[mode] || this.frames['thinking'];
    }

    public startAnimation(): void {
        this.stopAnimation();
        
        const speed = parseInt(this.getAttribute('speed') || '400', 10);
        const frames = this.getCurrentFrames();
        
        this.intervalId = window.setInterval(() => {
            if (!this.animationContent) return;
            
            let newIndex: number;
            do {
                newIndex = Math.floor(Math.random() * frames.length);
            } while (newIndex === this.currentFrameIndex && frames.length > 1);
            
            this.currentFrameIndex = newIndex;
            this.animationContent.textContent = frames[this.currentFrameIndex];
            
        }, speed);
    }
    
    public stopAnimation(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public play(): void {
        this.startAnimation();
    }
    
    public pause(): void {
        this.stopAnimation();
    }
    
    public setSpeed(speed: number): void {
        this.setAttribute('speed', speed.toString());
    }
    
    public setTheme(theme: string): void {
        this.setAttribute('theme', theme);
    }
    
    public setMode(mode: string): void {
        if (this.frames[mode]) {
            this.setAttribute('mode', mode);
            if (this.statusText) {
                this.statusText.textContent = mode;
            }
        }
    }
    
    public getMode(): string {
        return this.currentMode;
    }
    
    public analyzeQuestion(question: string): void {
        const lowerQuestion = question.toLowerCase();
        
        if (lowerQuestion.includes('?')) {
            this.setMode('thinking');
        }
        
        if (lowerQuestion.includes('курс') || lowerQuestion.includes('обучение') || 
            lowerQuestion.includes('начать') || lowerQuestion.includes('стоимость')) {
            this.setMode('happy');
        }
        
        if (lowerQuestion.includes('сложн') || lowerQuestion.includes('трудн') || 
            lowerQuestion.includes('проблем')) {
            this.setMode('clever');
        }
        
        if (lowerQuestion.includes('дорог') || lowerQuestion.includes('нет денег') || 
            lowerQuestion.includes('жалк')) {
            this.setMode('sad');
        }
        
        if (question.length < 5) {
            this.setMode('random');
        }
    }
}

customElements.define('thinking-animator', ThinkingAnimator);
