document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('camera-viewport');
    const world = document.getElementById('circuit-world');
    const canvas = document.getElementById('circuit-canvas');
    const ctx = canvas.getContext('2d');
    const lineTooltip = document.getElementById('line-tooltip');
    
    const stageAnalytics = {
        docs: "> INGESTING LOGS\n> Fetching threat detection logs...\n> Format: PCAP, Syslog, JSON\n> Extracted 1,204 anomalies.\n> Normalizing UTF-8...",
        chunk: "> CHUNKING ENGINE\n> Init RecursiveCharacterTextSplitter\n> Chunk Size: 512 tokens\n> Overlap: 50 tokens\n> Output: Structural nodes",
        embed: "> EMBEDDING MODEL\n> Architecture: Transformer (Dense)\n> Dimensions: 1536\n> Vectorizing tokens...\n> Output: Semantic vectors",
        db: "> REDIS VECTOR STORE\n> Upserting to HNSW Index...\n> Distance Metric: Cosine\n> Partition: Secure Enterprise\n> Status: Indexed",
        query: "> USER QUERY\n> Evaluating real-time DDoS query...\n> Payload: 'Identify traffic spike'\n> Sanitizing inputs...",
        embedQuery: "> QUERY EMBEDDING\n> Matching model dimensions\n> Converting to vector space\n> Array: [0.012, -0.441, 0.891...]",
        retrieve: "> C++ BACKEND RETRIEVAL\n> Executing ANN search...\n> Top-K Matches: 3\n> Score: 0.984\n> Fetching payload...",
        augment: "> AUGMENTATION\n> Injecting context...\n> Prompt template assembled.\n> Applying safety guardrails...",
        generate: "> LLM SYNTHESIS\n> Model: Active\n> Streaming response...\n> Token limit: 1024\n> Generation complete."
    };

    let permanentPaths = [];
    let activePayloads = [];
    
    const connections = [
        { from: 'chip-doc', to: 'chip-chunk', desc: "Raw text streams" },
        { from: 'chip-chunk', to: 'chip-embed1', desc: "Tokenized chunks" },
        { from: 'chip-embed1', to: 'chip-db', desc: "Dense vectors" },
        { from: 'chip-query', to: 'chip-embed2', desc: "Raw query string" },
        { from: 'chip-embed2', to: 'chip-retrieve', desc: "Query vector" },
        { from: 'chip-retrieve', to: 'chip-augment', desc: "Retrieved context" },
        { from: 'chip-augment', to: 'chip-generate', desc: "Augmented prompt" },
        { from: 'chip-db', to: 'chip-retrieve', isCross: true, desc: "Nearest neighbors" } 
    ];

    function getCenter(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return { x: 0, y: 0, width: 0, height: 0 };
        
        const elRect = el.getBoundingClientRect();
        const worldRect = world.getBoundingClientRect();
        const scale = worldRect.width / world.offsetWidth; 

        const x = ((elRect.left - worldRect.left) / scale) + (elRect.width / scale / 2);
        const y = ((elRect.top - worldRect.top) / scale) + (elRect.height / scale / 2);

        return { x: x, y: y, width: el.offsetWidth, height: el.offsetHeight };
    }

    function buildCircuitPaths() {
        canvas.width = world.offsetWidth;
        canvas.height = world.offsetHeight;
        permanentPaths = [];

        connections.forEach(conn => {
            const start = getCenter(conn.from);
            const end = getCenter(conn.to);
            const numLanes = conn.isCross ? 4 : 6; 
            
            for (let i = 0; i < numLanes; i++) {
                let path = [];
                // MASSIVE INCREASE: Spread lanes 16px apart instead of 8px
                let offset = (i - (numLanes - 1) / 2) * 16; 
                
                if (conn.isCross) {
                    let startX = start.x + offset;
                    let startY = start.y + (start.height / 2) + 20;
                    let endX = end.x + offset;
                    let endY = end.y - (end.height / 2) - 20;
                    
                    path.push({ x: startX, y: startY });
                    let midY1 = startY + 60;
                    path.push({ x: startX, y: midY1 });
                    
                    let midY2 = midY1 + 80; 
                    if (startX > endX) {
                        path.push({ x: startX - 60, y: midY2 });
                        path.push({ x: endX + 60, y: midY2 });
                    } else {
                        path.push({ x: startX + 60, y: midY2 });
                        path.push({ x: endX - 60, y: midY2 });
                    }
                    path.push({ x: endX, y: midY2 + 60 });
                    path.push({ x: endX, y: endY });

                } else {
                    let startX = start.x + (start.width / 2) + 20;
                    let startY = start.y + offset;
                    let endX = end.x - (end.width / 2) - 20;
                    let endY = end.y + offset;

                    path.push({ x: startX, y: startY });
                    let zigDir = i % 2 === 0 ? 1 : -1;
                    
                    // MASSIVE INCREASE: Huge 35px 45-degree sweeps
                    let zigDepth = 35;
                    
                    path.push({ x: startX + 30, y: startY });
                    path.push({ x: startX + 30 + zigDepth, y: startY + (zigDepth * zigDir) });
                    path.push({ x: endX - 30 - zigDepth, y: endY + (zigDepth * zigDir) });
                    path.push({ x: endX - 30, y: endY });
                    path.push({ x: endX, y: endY });
                }
                
                finalizePath(path, conn.desc, conn.from.includes('embed1') || conn.from.includes('doc') || conn.from.includes('chunk'));
            }
        });

        // Background Decorative Lines (Scaled Up)
        for(let i=0; i<40; i++) {
            let startX = Math.random() * canvas.width;
            let startY = Math.random() * canvas.height;
            let path = [{x: startX, y: startY}];
            
            let len = 100 + Math.random() * 250;
            path.push({x: startX + len, y: startY});
            
            if (Math.random() > 0.5) {
                let diag = 50 + Math.random() * 80;
                let dir = Math.random() > 0.5 ? 1 : -1;
                path.push({x: startX + len + diag, y: startY + (diag * dir)});
                path.push({x: startX + len + diag + 150, y: startY + (diag * dir)});
            }
            
            finalizePath(path, "Background process...", true);
        }
    }

    function finalizePath(path, desc, isMuted) {
        let segments = [];
        let totalLength = 0;
        for(let j = 0; j < path.length - 1; j++) {
            let dx = path[j+1].x - path[j].x;
            let dy = path[j+1].y - path[j].y;
            let len = Math.sqrt(dx*dx + dy*dy);
            segments.push({ start: path[j], end: path[j+1], length: len, cumulative: totalLength });
            totalLength += len;
        }
        permanentPaths.push({ path: path, segments: segments, totalLength: totalLength, desc: desc, isMuted: isMuted });
    }

    class DataPayload {
        constructor(pathData) {
            this.pathData = pathData;
            this.progress = -(Math.random() * 0.5); 
            this.speed = 0.002 + (Math.random() * 0.003);
            this.color = pathData.isMuted ? '#9ca3af' : '#f59e0b';
        }
        update(speedModifier) {
            this.progress += (this.speed * speedModifier);
            return this.progress > 1.2;
        }
        draw(ctx) {
            if (this.progress < 0 || this.progress > 1) return;
            let currentDist = this.progress * this.pathData.totalLength;
            let currentPos = {x: this.pathData.path[0].x, y: this.pathData.path[0].y};
            let activeSegIndex = 0;

            for(let i = 0; i < this.pathData.segments.length; i++) {
                let seg = this.pathData.segments[i];
                if(currentDist >= seg.cumulative && currentDist <= seg.cumulative + seg.length) {
                    activeSegIndex = i;
                    let ratio = (currentDist - seg.cumulative) / seg.length;
                    currentPos.x = seg.start.x + (seg.end.x - seg.start.x) * ratio;
                    currentPos.y = seg.start.y + (seg.end.y - seg.start.y) * ratio;
                    break;
                }
            }

            let trailLength = 120; // Longer trails
            let trailStartDist = Math.max(0, currentDist - trailLength);
            ctx.beginPath();
            ctx.moveTo(currentPos.x, currentPos.y);

            let distLeft = currentDist - trailStartDist;
            let tempDist = currentDist;
            let traceIndex = activeSegIndex;

            while(distLeft > 0 && traceIndex >= 0) {
                let seg = this.pathData.segments[traceIndex];
                let distInSeg = tempDist - seg.cumulative;
                if (distLeft >= distInSeg) {
                    ctx.lineTo(seg.start.x, seg.start.y);
                    distLeft -= distInSeg;
                    tempDist = seg.cumulative;
                    traceIndex--;
                } else {
                    let endRatio = (distInSeg - distLeft) / seg.length;
                    let targetX = seg.start.x + (seg.end.x - seg.start.x) * endRatio;
                    let targetY = seg.start.y + (seg.end.y - seg.start.y) * endRatio;
                    ctx.lineTo(targetX, targetY);
                    distLeft = 0;
                }
            }

            // MASSIVE INCREASE: Thicker trails and larger glow
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Larger packet head
            ctx.beginPath();
            ctx.arc(currentPos.x, currentPos.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    }

    let isInspecting = false;
    let autoPanTween;

    function startAutoPan() {
        if (isInspecting) return;
        const maxScroll = Math.max(0, world.offsetWidth - viewport.offsetWidth);
        autoPanTween = gsap.fromTo(world, 
            { x: 0, y: 0, scale: 1 }, 
            { x: -maxScroll, duration: 30, ease: "sine.inOut", repeat: -1, yoyo: true }
        );
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // MASSIVE INCREASE: Thicker, slightly darker base circuitry
        ctx.lineWidth = 2.5;
        for (let p of permanentPaths) {
            ctx.beginPath();
            ctx.moveTo(p.path[0].x, p.path[0].y);
            for(let i = 1; i < p.path.length; i++) {
                ctx.lineTo(p.path[i].x, p.path[i].y);
            }
            ctx.strokeStyle = 'rgba(209, 213, 219, 0.6)'; 
            ctx.stroke();
        }

        let speedModifier = isInspecting ? 0.15 : 1.0;

        if (Math.random() < (0.12 * speedModifier)) {
            const randomPath = permanentPaths[Math.floor(Math.random() * permanentPaths.length)];
            activePayloads.push(new DataPayload(randomPath));
        }

        activePayloads = activePayloads.filter(payload => {
            const finished = payload.update(speedModifier);
            payload.draw(ctx);
            return !finished;
        });

        requestAnimationFrame(animateCanvas);
    }

    function getDistToSegment(p, v, w) {
        let l2 = (w.x - v.x)**2 + (w.y - v.y)**2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    viewport.addEventListener('mousemove', (e) => {
        if (isInspecting) return;
        
        const worldRect = world.getBoundingClientRect();
        const scale = worldRect.width / world.offsetWidth;
        
        const mouseX = (e.clientX - worldRect.left) / scale;
        const mouseY = (e.clientY - worldRect.top) / scale;

        let foundHover = false;
        for (let p of permanentPaths) {
            for (let seg of p.segments) {
                // Increased hover detection radius for the thicker lines
                if (getDistToSegment({x: mouseX, y: mouseY}, seg.start, seg.end) < 14) {
                    lineTooltip.querySelector('.tooltip-data').textContent = p.desc;
                    lineTooltip.style.left = `${e.clientX}px`;
                    lineTooltip.style.top = `${e.clientY}px`;
                    lineTooltip.classList.remove('hidden');
                    foundHover = true;
                    break;
                }
            }
            if (foundHover) break;
        }
        if (!foundHover) lineTooltip.classList.add('hidden');
    });

    viewport.addEventListener('mouseleave', () => lineTooltip.classList.add('hidden'));

    async function typeTerminalText(element, text) {
        element.innerHTML = '';
        const chars = text.split('');
        for (let i = 0; i < chars.length; i++) {
            if (!element.parentElement.parentElement.classList.contains('expanded')) break; 
            element.innerHTML += chars[i] === '\n' ? '<br>' : chars[i];
            await new Promise(r => setTimeout(r, 15)); 
        }
    }

    const chips = document.querySelectorAll('.chip-node');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            
            chips.forEach(c => {
                if(c !== chip) {
                    c.classList.remove('expanded');
                    c.querySelector('.terminal-text').innerHTML = '';
                }
            });

            const wasExpanded = chip.classList.contains('expanded');
            
            if (wasExpanded) {
                chip.classList.remove('expanded');
                chip.querySelector('.terminal-text').innerHTML = '';
                isInspecting = false;
                gsap.to(world, { scale: 1, y: 0, duration: 1, ease: "power3.inOut", onComplete: () => { if(autoPanTween) autoPanTween.play(); }});
            } else {
                isInspecting = true;
                if(autoPanTween) autoPanTween.pause();
                chip.classList.add('expanded');
                lineTooltip.classList.add('hidden'); 

                const elRect = chip.getBoundingClientRect();
                const worldRect = world.getBoundingClientRect();
                const currentScale = worldRect.width / world.offsetWidth;
                
                const chipLocalX = ((elRect.left - worldRect.left) / currentScale) + (320 / 2);
                const chipLocalY = ((elRect.top - worldRect.top) / currentScale) + (220 / 2);
                
                const targetScale = 1.4;
                const targetX = (viewport.offsetWidth / 2) - (chipLocalX * targetScale);
                const targetY = (viewport.offsetHeight / 2) - (chipLocalY * targetScale);

                gsap.to(world, { x: targetX, y: targetY, scale: targetScale, duration: 1, ease: "power3.inOut" });

                const stageKey = chip.getAttribute('data-stage');
                const termElement = chip.querySelector('.terminal-text');
                setTimeout(() => typeTerminalText(termElement, stageAnalytics[stageKey]), 300);
            }
        });
    });

    world.addEventListener('click', () => {
        if(isInspecting) {
            chips.forEach(c => {
                c.classList.remove('expanded');
                c.querySelector('.terminal-text').innerHTML = '';
            });
            isInspecting = false;
            gsap.to(world, { scale: 1, y: 0, duration: 1, ease: "power3.inOut", onComplete: () => { if(autoPanTween) autoPanTween.play(); }});
        }
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            buildCircuitPaths();
            startAutoPan();
            animateCanvas();
        }, 150);
    });

    window.addEventListener('resize', () => {
        buildCircuitPaths();
        if (!isInspecting) {
            if (autoPanTween) autoPanTween.kill();
            startAutoPan();
        }
    });
});