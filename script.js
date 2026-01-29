/**
 * AmidaGo! - Core Logic
 */

class AmidaApp {
    constructor() {
        this.canvas = document.getElementById('amida-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.participantInput = document.getElementById('participant-count');
        this.goalsContainer = document.getElementById('goals-container');
        this.generateBtn = document.getElementById('generate-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.startButtonsOverlay = document.getElementById('start-buttons');
        this.resultCard = document.getElementById('result-card');
        this.resultDisplay = document.getElementById('result-display');
        this.resultPlaceholder = this.resultCard.querySelector('.result-placeholder');

        this.config = {
            padding: 40,
            lineSpacing: 80,
            lineHeight: 400,
            horizontalDensity: 0.6, // 横線の密度の目安
        };

        this.state = {
            participants: 5,
            horizontals: [], // {y, from}
            goalMapping: [], // 縦線インデックス -> ゴール入力インデックス
            revealedGoals: new Set(), // 表示済みゴールインデックス（縦線のインデックス）
            animating: false,
            path: [], // 現在のアニメーション経路
        };

        this.init();
    }

    init() {
        this.updateGoalsFields();
        this.participantInput.addEventListener('change', () => this.updateGoalsFields());
        this.generateBtn.addEventListener('click', () => this.generateAmida());
        this.resetBtn.addEventListener('click', () => this.reset());

        // 初回描画
        this.generateAmida();
    }

    updateGoalsFields() {
        const count = parseInt(this.participantInput.value);
        if (count < 2) return;
        if (count > 20) return;

        this.state.participants = count;
        this.goalsContainer.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const wrap = document.createElement('div');
            wrap.className = 'goal-input-wrap';

            const label = document.createElement('label');
            label.textContent = `ゴール ${i + 1}`;

            const input = document.createElement('input');
            input.type = 'text';
            input.value = `${i + 1}`; // 初期値を数字に
            input.dataset.index = i;

            input.addEventListener('input', () => this.draw()); // 入力変更時にCanvasを描画し直す

            wrap.appendChild(label);
            wrap.appendChild(input);
            this.goalsContainer.appendChild(wrap);
        }

        this.state.goalMapping = Array.from({ length: count }, (_, i) => i);
        this.resizeCanvas();
    }

    resizeCanvas() {
        const width = (this.state.participants - 1) * this.config.lineSpacing + this.config.padding * 2;
        const height = this.config.lineHeight + this.config.padding * 2;

        this.canvas.width = width;
        this.canvas.height = height;

        this.draw();
        this.updateStartButtons();
    }

    updateStartButtons() {
        this.startButtonsOverlay.innerHTML = '';
        for (let i = 0; i < this.state.participants; i++) {
            const btn = document.createElement('button');
            btn.className = 'start-btn';
            btn.textContent = String.fromCharCode(65 + i);
            // .start-buttons-overlayのleft: 40pxからの相対位置
            const x = i * this.config.lineSpacing;
            btn.style.left = `${x}px`;
            btn.addEventListener('click', () => this.startPath(i));
            this.startButtonsOverlay.appendChild(btn);
        }
    }

    generateAmida() {
        if (this.state.animating) return;

        const count = this.state.participants;
        const horizontals = [];

        // 横線をランダムに生成
        const steps = 15;
        const stepSize = this.config.lineHeight / steps;

        for (let i = 0; i < count - 1; i++) {
            for (let s = 1; s < steps; s++) {
                if (Math.random() < this.config.horizontalDensity) {
                    const y = s * stepSize;
                    const existsLeft = horizontals.some(h => h.y === y && h.from === i - 1);
                    if (!existsLeft) {
                        horizontals.push({ y, from: i });
                    }
                }
            }
        }

        this.state.horizontals = horizontals.sort((a, b) => a.y - b.y);

        // ゴールマッピングをシャッフル
        this.shuffleGoalMapping();

        this.state.revealedGoals.clear(); // 新しく生成した時はリセット
        this.state.path = [];
        this.hideResult();
        this.draw();
    }

    shuffleGoalMapping() {
        const mapping = Array.from({ length: this.state.participants }, (_, i) => i);

        // Fisher-Yates 
        for (let i = mapping.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mapping[i], mapping[j]] = [mapping[j], mapping[i]];
        }

        this.state.goalMapping = mapping;
    }

    draw(highlightPath = null) {
        const { ctx, canvas, config, state } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const offsetX = config.padding;
        const offsetY = config.padding;

        // 縦線の描画
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        for (let i = 0; i < state.participants; i++) {
            const x = offsetX + i * config.lineSpacing;
            ctx.beginPath();
            ctx.moveTo(x, offsetY);
            ctx.lineTo(x, offsetY + config.lineHeight);
            ctx.stroke();
        }

        // 横線の描画
        for (const h of state.horizontals) {
            const x1 = offsetX + h.from * config.lineSpacing;
            const x2 = x1 + config.lineSpacing;
            const y = offsetY + h.y;

            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
        }

        // ゴール名の描画（Canvas下部）
        ctx.fillStyle = config.textColor || '#94a3b8';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        const goalInputs = this.goalsContainer.querySelectorAll('input');

        for (let i = 0; i < state.participants; i++) {
            const isRevealed = state.revealedGoals.has(i);
            const goalIdx = state.goalMapping[i];
            const text = isRevealed ? (goalInputs[goalIdx] ? goalInputs[goalIdx].value : `?`) : `?`;
            const x = offsetX + i * config.lineSpacing;

            // 未表示の場合は少し薄くするなど
            ctx.globalAlpha = isRevealed ? 1.0 : 0.3;
            ctx.fillText(text, x, offsetY + config.lineHeight + 30);
            ctx.globalAlpha = 1.0;
        }

        // 経路のハイライト（アニメーション用）
        if (highlightPath && highlightPath.length > 1) {
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 6;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#6366f1';

            ctx.beginPath();
            ctx.moveTo(offsetX + highlightPath[0].x * config.lineSpacing, offsetY + highlightPath[0].y);

            for (let i = 1; i < highlightPath.length; i++) {
                ctx.lineTo(offsetX + highlightPath[i].x * config.lineSpacing, offsetY + highlightPath[i].y);
            }
            ctx.stroke();

            ctx.shadowBlur = 0; // リセット
        }
    }

    startPath(participantIndex) {
        if (this.state.animating) return;

        this.state.animating = true;
        this.hideResult();

        const path = [];
        let currentX = participantIndex;
        let currentY = 0;

        // 経路の計算
        path.push({ x: currentX, y: currentY });

        // ソート済みの横線を利用して経路を構築
        const relevantHorizontals = [...this.state.horizontals].sort((a, b) => a.y - b.y);

        for (const h of relevantHorizontals) {
            if (h.from === currentX) {
                // 左から右へ
                path.push({ x: currentX, y: h.y });
                currentX++;
                path.push({ x: currentX, y: h.y });
            } else if (h.from === currentX - 1) {
                // 右から左へ
                path.push({ x: currentX, y: h.y });
                currentX--;
                path.push({ x: currentX, y: h.y });
            }
        }

        path.push({ x: currentX, y: this.config.lineHeight });

        this.animatePath(path, participantIndex, currentX);
    }

    animatePath(fullPath, startIndex, goalIndex) {
        let currentSegment = 0;
        let progress = 0;
        const speed = 15; // 速度

        const animatedSegments = [{ x: fullPath[0].x, y: fullPath[0].y }];

        const animate = () => {
            if (currentSegment >= fullPath.length - 1) {
                this.state.animating = false;
                this.showResult(startIndex, goalIndex);
                return;
            }

            const start = fullPath[currentSegment];
            const end = fullPath[currentSegment + 1];

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx * dy * dy); // おおよその距離感

            progress += speed;

            // 線分内での位置計算
            // 実際にはもっと厳密な補間が必要だが、一旦シンプルに
            const segmentDist = Math.abs(dx * this.config.lineSpacing) + Math.abs(dy);
            const ratio = Math.min(progress / segmentDist, 1);

            const currentPoint = {
                x: start.x + dx * ratio,
                y: start.y + dy * ratio
            };

            const currentPath = [...animatedSegments, currentPoint];
            this.draw(currentPath);

            if (ratio >= 1) {
                animatedSegments.push(fullPath[currentSegment + 1]);
                currentSegment++;
                progress = 0;
            }

            requestAnimationFrame(animate);
        };

        animate();
    }

    showResult(startIndex, goalIndex) {
        this.state.revealedGoals.add(goalIndex); // ゴールを表示済みに追加
        this.draw(); // ゴールラベルを描画し直す

        const userName = String.fromCharCode(65 + startIndex) + " さん";
        const goalInputs = this.goalsContainer.querySelectorAll('input');

        // goalIndexに対応する goalMapping[goalIndex] の入力値を表示
        const targetGoalIdx = this.state.goalMapping[goalIndex];
        const goalText = goalInputs[targetGoalIdx].value || "不明";

        this.resultPlaceholder.style.display = 'none';
        this.resultDisplay.style.display = 'block';
        this.resultDisplay.querySelector('.user-name').textContent = userName;
        this.resultDisplay.querySelector('.goal-text').textContent = goalText;

        // 視覚的強調のためにカードを少し揺らすなどの演出はCSSで可能
        this.resultCard.classList.add('pulse');
        setTimeout(() => this.resultCard.classList.remove('pulse'), 1000);
    }

    hideResult() {
        this.resultPlaceholder.style.display = 'block';
        this.resultDisplay.style.display = 'none';
    }

    reset() {
        if (this.state.animating) return;
        this.state.horizontals = [];
        this.state.path = [];
        this.state.revealedGoals.clear();
        this.hideResult();
        this.generateAmida();
    }
}

// アプリの起動
window.addEventListener('DOMContentLoaded', () => {
    new AmidaApp();
});
