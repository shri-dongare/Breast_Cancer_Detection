/* ==========================================================================
   AI BREAST CANCER DETECTION
   PREMIUM MEDICAL DASHBOARD
   dashboard.js
   PART 1
   ========================================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================
       DOM
       ========================================================== */

    const body = document.body;

    const dropzone =
        document.querySelector(".dropzone");

    const fileInput =
        document.querySelector(".dropzone-input");

    const browseButton =
        document.querySelector(".browse-btn");

    const uploadForm =
        document.querySelector(".upload-form");

    const submitButton =
        document.querySelector(".submit-btn");

    const spinner =
        document.querySelector(".btn-spinner");

    const label =
        document.querySelector(".btn-label");

    const previewImage =
        document.querySelector("#previewImage");

    const previewContainer =
        document.querySelector(".image-frame");

    const fadeElements =
        document.querySelectorAll(".fade-up");

    const counters =
        document.querySelectorAll(".stat-value");

    const confidenceRing =
        document.querySelector(".confidence-ring");

    const confidenceValue =
        document.querySelector(".confidence-value");

    const navbar =
        document.querySelector(".site-nav");

    const canvas =
        document.getElementById("particle-canvas");

    /* ==========================================================
       UTILITIES
       ========================================================== */

    const clamp = (v, min, max) =>
        Math.min(Math.max(v, min), max);

    const random = (min, max) =>
        Math.random() * (max - min) + min;

    /* ==========================================================
       NAVBAR SHADOW
       ========================================================== */

    window.addEventListener("scroll", () => {

        if (!navbar) return;

        if (window.scrollY > 20) {

            navbar.style.background =
                "rgba(2,6,23,.92)";

            navbar.style.backdropFilter =
                "blur(22px)";

            navbar.style.boxShadow =
                "0 10px 30px rgba(0,0,0,.25)";

        } else {

            navbar.style.background =
                "rgba(2,6,23,.75)";

            navbar.style.boxShadow =
                "none";

        }

    });

    /* ==========================================================
       SCROLL REVEAL
       ========================================================== */

    if ("IntersectionObserver" in window) {

        const observer =
            new IntersectionObserver(

                (entries) => {

                    entries.forEach((entry) => {

                        if (entry.isIntersecting) {

                            entry.target.style.animationDelay =
                                `${entry.target.dataset.delay || 0}ms`;

                            entry.target.classList.add("visible");

                            observer.unobserve(entry.target);

                        }

                    });

                },

                {
                    threshold: .15
                }

            );

        fadeElements.forEach(el => {

            observer.observe(el);

        });

    }

    /* ==========================================================
       COUNTER ANIMATION
       ========================================================== */

    function animateCounter(element) {

        const raw =
            element.textContent.trim();

        const target =
            parseFloat(raw.replace(/[^\d.]/g, ""));

        if (isNaN(target))
            return;

        const duration = 1800;

        const start = performance.now();

        const suffix =
            raw.replace(/[0-9.]/g, "");

        function update(time) {

            const progress =
                Math.min((time - start) / duration, 1);

            const eased =
                1 - Math.pow(1 - progress, 3);

            const value =
                target * eased;

            if (Number.isInteger(target)) {

                element.textContent =
                    Math.floor(value) + suffix;

            } else {

                element.textContent =
                    value.toFixed(1) + suffix;

            }

            if (progress < 1) {

                requestAnimationFrame(update);

            }

        }

        requestAnimationFrame(update);

    }

    if ("IntersectionObserver" in window) {

        const counterObserver =
            new IntersectionObserver(

                entries => {

                    entries.forEach(entry => {

                        if (entry.isIntersecting) {

                            animateCounter(entry.target);

                            counterObserver.unobserve(entry.target);

                        }

                    });

                },

                {
                    threshold: .5
                }

            );

        counters.forEach(counter => {

            counterObserver.observe(counter);

        });

    }

});
/* ==========================================================================
   PART 2
   DRAG & DROP
   FILE PREVIEW
   FORM SUBMISSION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const dropzone =
        document.querySelector(".dropzone");

    const fileInput =
        document.querySelector(".dropzone-input");

    const browseButton =
        document.querySelector(".browse-btn");

    const uploadForm =
        document.querySelector(".upload-form");

    const submitButton =
        document.querySelector(".submit-btn");

    const previewImage =
        document.getElementById("previewImage");

    const imageFrame =
        document.querySelector(".image-frame");

    const spinner =
        document.querySelector(".btn-spinner");

    const buttonLabel =
        document.querySelector(".btn-label");

    /* ==========================================================
       OPEN FILE PICKER
       ========================================================== */

    if (browseButton && fileInput) {

        browseButton.addEventListener("click", (e) => {

            e.preventDefault();

            fileInput.click();

        });

    }

    if (dropzone && fileInput) {

        dropzone.addEventListener("click", () => {

            fileInput.click();

        });

    }

    /* ==========================================================
       DRAG EVENTS
       ========================================================== */

    if (dropzone) {

        ["dragenter", "dragover"].forEach(event => {

            dropzone.addEventListener(event, (e) => {

                e.preventDefault();

                e.stopPropagation();

                dropzone.classList.add("dragover");

            });

        });

        ["dragleave", "dragend"].forEach(event => {

            dropzone.addEventListener(event, (e) => {

                e.preventDefault();

                e.stopPropagation();

                dropzone.classList.remove("dragover");

            });

        });

        dropzone.addEventListener("drop", (e) => {

            e.preventDefault();

            e.stopPropagation();

            dropzone.classList.remove("dragover");

            const files = e.dataTransfer.files;

            if (files.length) {

                fileInput.files = files;

                handleFile(files[0]);

            }

        });

    }

    /* ==========================================================
       FILE INPUT
       ========================================================== */

    if (fileInput) {

        fileInput.addEventListener("change", () => {

            if (fileInput.files.length) {

                handleFile(fileInput.files[0]);

            }

        });

    }

    /* ==========================================================
       HANDLE FILE
       ========================================================== */

    function handleFile(file) {

        if (!file) return;

        if (!file.type.startsWith("image/")) {

            alert("Please upload an image file.");

            return;

        }

        dropzone.classList.add("has-file");

        const reader = new FileReader();

        reader.onload = function (e) {

            if (previewImage) {

                previewImage.src = e.target.result;

                previewImage.style.display = "block";

            }

            if (imageFrame) {

                imageFrame.classList.remove("image-loading");

            }

        };

        if (imageFrame) {

            imageFrame.classList.add("image-loading");

        }

        reader.readAsDataURL(file);

    }

    /* ==========================================================
       SUBMIT
       ========================================================== */

    if (uploadForm) {

        uploadForm.addEventListener("submit", () => {

            if (submitButton) {

                submitButton.classList.add("loading");

                submitButton.disabled = true;

            }

            if (buttonLabel) {

                buttonLabel.textContent = "Analyzing MRI...";

            }

            if (spinner) {

                spinner.style.display = "block";

            }

        });

    }

});
/* ==========================================================================
   PART 3
   PARTICLE BACKGROUND
   CONFIDENCE RING
   FLOATING EFFECTS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================
       PARTICLE BACKGROUND
       ========================================================== */

    const canvas = document.getElementById("particle-canvas");

    if (canvas) {

        const ctx = canvas.getContext("2d");

        let particles = [];

        function resizeCanvas() {

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

        }

        resizeCanvas();

        window.addEventListener("resize", resizeCanvas);

        class Particle {

            constructor() {

                this.reset();

            }

            reset() {

                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;

                this.radius = Math.random() * 2 + 1;

                this.speedX = (Math.random() - 0.5) * 0.4;
                this.speedY = (Math.random() - 0.5) * 0.4;

                this.alpha = Math.random() * 0.5 + 0.2;

            }

            update() {

                this.x += this.speedX;
                this.y += this.speedY;

                if (
                    this.x < 0 ||
                    this.x > canvas.width ||
                    this.y < 0 ||
                    this.y > canvas.height
                ) {

                    this.reset();

                }

            }

            draw() {

                ctx.beginPath();

                ctx.arc(
                    this.x,
                    this.y,
                    this.radius,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    `rgba(6,182,212,${this.alpha})`;

                ctx.fill();

            }

        }

        for (let i = 0; i < 80; i++) {

            particles.push(new Particle());

        }

        function connectParticles() {

            for (let a = 0; a < particles.length; a++) {

                for (let b = a + 1; b < particles.length; b++) {

                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;

                    const distance =
                        Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {

                        ctx.beginPath();

                        ctx.strokeStyle =
                            `rgba(37,99,235,${0.18 - distance / 700})`;

                        ctx.lineWidth = 1;

                        ctx.moveTo(
                            particles[a].x,
                            particles[a].y
                        );

                        ctx.lineTo(
                            particles[b].x,
                            particles[b].y
                        );

                        ctx.stroke();

                    }

                }

            }

        }

        function animateParticles() {

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            particles.forEach(p => {

                p.update();
                p.draw();

            });

            connectParticles();

            requestAnimationFrame(
                animateParticles
            );

        }

        animateParticles();

    }

    /* ==========================================================
       CONFIDENCE RING
       ========================================================== */

    const ring =
        document.querySelector(".confidence-ring");

    const value =
        document.querySelector(".confidence-value");

    if (ring && value) {

        const percent =
            parseFloat(
                value.textContent.replace("%", "")
            ) || 0;

        let current = 0;

        function animateRing() {

            current += 1;

            if (current > percent)
                current = percent;

            ring.style.setProperty(
                "--confidence-pct",
                current
            );

            value.textContent =
                current.toFixed(0) + "%";

            if (current < percent) {

                requestAnimationFrame(
                    animateRing
                );

            }

        }

        animateRing();

    }

    /* ==========================================================
       FLOAT CARDS
       ========================================================== */

    document
        .querySelectorAll(
            ".feature-card,.stat-card,.result-card"
        )
        .forEach((card) => {

            card.addEventListener(
                "mousemove",
                (e) => {

                    const rect =
                        card.getBoundingClientRect();

                    const x =
                        e.clientX - rect.left;

                    const y =
                        e.clientY - rect.top;

                    const rotateX =
                        ((y / rect.height) - 0.5) * -8;

                    const rotateY =
                        ((x / rect.width) - 0.5) * 8;

                    card.style.transform =
                        `perspective(1000px)
                        rotateX(${rotateX}deg)
                        rotateY(${rotateY}deg)
                        translateY(-8px)`;

                }
            );

            card.addEventListener(
                "mouseleave",
                () => {

                    card.style.transform = "";

                }
            );

        });

});
/* ==========================================================================
   PART 4
   SMOOTH SCROLL
   RIPPLE EFFECT
   TOOLTIPS
   ACTIVE NAV
   BACK TO TOP
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================
       SMOOTH SCROLL
       ========================================================== */

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function (e) {

            const target =
                document.querySelector(
                    this.getAttribute("href")
                );

            if (!target) return;

            e.preventDefault();

            window.scrollTo({

                top:
                    target.offsetTop - 90,

                behavior: "smooth"

            });

        });

    });

    /* ==========================================================
       RIPPLE EFFECT
       ========================================================== */

    document
        .querySelectorAll(
            ".submit-btn,.browse-btn,.logout-btn"
        )
        .forEach(button => {

            button.addEventListener("click", function (e) {

                const ripple =
                    document.createElement("span");

                const rect =
                    this.getBoundingClientRect();

                const size =
                    Math.max(rect.width, rect.height);

                ripple.style.width =
                    ripple.style.height =
                    size + "px";

                ripple.style.left =
                    e.clientX -
                    rect.left -
                    size / 2 +
                    "px";

                ripple.style.top =
                    e.clientY -
                    rect.top -
                    size / 2 +
                    "px";

                ripple.className =
                    "js-ripple";

                this.appendChild(ripple);

                setTimeout(() => {

                    ripple.remove();

                }, 650);

            });

        });

    /* ==========================================================
       ACTIVE NAV LINK
       ========================================================== */

    const sections =
        document.querySelectorAll("section[id]");

    const navLinks =
        document.querySelectorAll(".nav-links a");

    if (sections.length && navLinks.length) {

        window.addEventListener("scroll", () => {

            let current = "";

            sections.forEach(section => {

                const top =
                    section.offsetTop - 140;

                if (scrollY >= top) {

                    current = section.id;

                }

            });

            navLinks.forEach(link => {

                link.classList.remove("nav-active");

                if (
                    link.getAttribute("href") ===
                    "#" + current
                ) {

                    link.classList.add("nav-active");

                }

            });

        });

    }

    /* ==========================================================
       BACK TO TOP BUTTON
       ========================================================== */

    let topButton =
        document.querySelector(".back-to-top");

    if (!topButton) {

        topButton =
            document.createElement("button");

        topButton.className =
            "back-to-top";

        topButton.innerHTML =
            "↑";

        document.body.appendChild(
            topButton
        );

    }

    Object.assign(topButton.style, {

        position: "fixed",
        right: "28px",
        bottom: "28px",
        width: "54px",
        height: "54px",
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        fontSize: "22px",
        color: "#fff",
        background:
            "linear-gradient(135deg,#2563eb,#06b6d4)",
        display: "none",
        zIndex: "999",
        boxShadow:
            "0 15px 35px rgba(37,99,235,.35)",
        transition: ".35s"

    });

    window.addEventListener("scroll", () => {

        if (window.scrollY > 450) {

            topButton.style.display =
                "block";

        } else {

            topButton.style.display =
                "none";

        }

    });

    topButton.addEventListener("click", () => {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

    /* ==========================================================
       SIMPLE TOOLTIPS
       ========================================================== */

    document
        .querySelectorAll("[data-tooltip]")
        .forEach(element => {

            element.addEventListener("mouseenter", () => {

                const tooltip =
                    document.createElement("div");

                tooltip.className =
                    "simple-tooltip";

                tooltip.textContent =
                    element.dataset.tooltip;

                document.body.appendChild(
                    tooltip
                );

                const rect =
                    element.getBoundingClientRect();

                Object.assign(
                    tooltip.style,
                    {

                        position: "fixed",
                        left:
                            rect.left +
                            rect.width / 2 +
                            "px",

                        top:
                            rect.top - 12 +
                            "px",

                        transform:
                            "translate(-50%,-100%)",

                        background:
                            "rgba(2,6,23,.95)",

                        color: "#fff",

                        padding:
                            "10px 14px",

                        borderRadius:
                            "12px",

                        fontSize:
                            ".85rem",

                        pointerEvents:
                            "none",

                        whiteSpace:
                            "nowrap",

                        zIndex: 9999,

                        border:
                            "1px solid rgba(255,255,255,.08)"

                    }

                );

                element._tooltip =
                    tooltip;

            });

            element.addEventListener("mouseleave", () => {

                if (element._tooltip) {

                    element._tooltip.remove();

                }

            });

        });

});
/* ==========================================================================
   PART 5
   TYPEWRITER
   PARALLAX
   THEME EFFECTS
   PERFORMANCE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================
       TYPEWRITER EFFECT
       ========================================================== */

    const heroTitle = document.querySelector(".hero-banner h1");

    if (heroTitle) {

        const originalText = heroTitle.textContent.trim();

        heroTitle.textContent = "";

        let index = 0;

        function typeWriter() {

            if (index < originalText.length) {

                heroTitle.textContent += originalText.charAt(index);

                index++;

                setTimeout(typeWriter, 35);

            }

        }

        setTimeout(typeWriter, 300);

    }

    /* ==========================================================
       HERO PARALLAX
       ========================================================== */

    const hero = document.querySelector(".hero-banner");

    if (hero) {

        hero.addEventListener("mousemove", (e) => {

            const rect = hero.getBoundingClientRect();

            const x = (e.clientX - rect.left) / rect.width;

            const y = (e.clientY - rect.top) / rect.height;

            hero.style.backgroundPosition =
                `${50 + x * 6}% ${50 + y * 6}%`;

        });

        hero.addEventListener("mouseleave", () => {

            hero.style.backgroundPosition = "center";

        });

    }

    /* ==========================================================
       MAGNETIC BUTTONS
       ========================================================== */

    document.querySelectorAll(".submit-btn,.browse-btn").forEach(btn => {

        btn.addEventListener("mousemove", (e) => {

            const rect = btn.getBoundingClientRect();

            const x = e.clientX - rect.left - rect.width / 2;

            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform =
                `translate(${x * .12}px,${y * .12}px)`;

        });

        btn.addEventListener("mouseleave", () => {

            btn.style.transform = "";

        });

    });

    /* ==========================================================
       IMAGE ZOOM
       ========================================================== */

    document.querySelectorAll(".image-frame img").forEach(img => {

        img.addEventListener("click", () => {

            const overlay = document.createElement("div");

            overlay.className = "image-overlay";

            Object.assign(overlay.style, {

                position: "fixed",
                inset: "0",
                background: "rgba(0,0,0,.92)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: "99999",
                cursor: "zoom-out"

            });

            const clone = img.cloneNode();

            Object.assign(clone.style, {

                maxWidth: "90%",
                maxHeight: "90%",
                borderRadius: "20px",
                boxShadow: "0 30px 80px rgba(0,0,0,.5)"

            });

            overlay.appendChild(clone);

            overlay.addEventListener("click", () => {

                overlay.remove();

            });

            document.body.appendChild(overlay);

        });

    });

    /* ==========================================================
       PERFORMANCE FPS LIMIT
       ========================================================== */

    let ticking = false;

    window.addEventListener("scroll", () => {

        if (!ticking) {

            window.requestAnimationFrame(() => {

                ticking = false;

            });

            ticking = true;

        }

    });

    /* ==========================================================
       PREVENT DOUBLE SUBMIT
       ========================================================== */

    const form = document.querySelector(".upload-form");

    if (form) {

        let submitted = false;

        form.addEventListener("submit", (e) => {

            if (submitted) {

                e.preventDefault();

                return;

            }

            submitted = true;

        });

    }

    /* ==========================================================
       COPY RESULT BUTTON
       ========================================================== */

    const copyButton = document.querySelector(".copy-result");

    if (copyButton) {

        copyButton.addEventListener("click", async () => {

            const prediction = document.querySelector(".diagnosis-badge");

            if (!prediction) return;

            try {

                await navigator.clipboard.writeText(prediction.innerText);

                copyButton.innerText = "Copied ✓";

                setTimeout(() => {

                    copyButton.innerText = "Copy";

                }, 2000);

            }

            catch {

                console.log("Clipboard unavailable");

            }

        });

    }

});
/* ==========================================================================
   PART 6
   FINAL INITIALIZATION
   ACCESSIBILITY
   AUTO HIDE ALERTS
   KEYBOARD SHORTCUTS
   NETWORK STATUS
   ERROR HANDLING
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================
       AUTO HIDE ALERTS
       ========================================================== */

    document.querySelectorAll(".alert").forEach(alert => {

        setTimeout(() => {

            alert.style.transition = ".5s";

            alert.style.opacity = "0";

            alert.style.transform = "translateY(-15px)";

            setTimeout(() => {

                alert.remove();

            }, 500);

        }, 5000);

    });

    /* ==========================================================
       ACCESSIBILITY
       ========================================================== */

    document.querySelectorAll("button").forEach(button => {

        if (!button.getAttribute("aria-label")) {

            button.setAttribute(
                "aria-label",
                button.innerText.trim()
            );

        }

    });

    document.querySelectorAll("img").forEach(image => {

        if (!image.alt) {

            image.alt = "Medical image";

        }

    });

    /* ==========================================================
       KEYBOARD SHORTCUTS
       ========================================================== */

    document.addEventListener("keydown", (e) => {

        /* Ctrl + U -> Upload */

        if (e.ctrlKey && e.key.toLowerCase() === "u") {

            e.preventDefault();

            const input =
                document.querySelector(".dropzone-input");

            if (input) {

                input.click();

            }

        }

        /* Escape -> Close image preview */

        if (e.key === "Escape") {

            const overlay =
                document.querySelector(".image-overlay");

            if (overlay) {

                overlay.remove();

            }

        }

    });

    /* ==========================================================
       ONLINE / OFFLINE STATUS
       ========================================================== */

    function notify(message, color) {

        let toast =
            document.createElement("div");

        toast.textContent = message;

        Object.assign(toast.style, {

            position: "fixed",

            top: "24px",

            right: "24px",

            padding: "14px 20px",

            background: color,

            color: "#fff",

            borderRadius: "14px",

            zIndex: "999999",

            boxShadow:
                "0 20px 40px rgba(0,0,0,.25)",

            fontWeight: "600",

            opacity: "0",

            transform: "translateY(-15px)",

            transition: ".35s"

        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => {

            toast.style.opacity = "1";

            toast.style.transform = "translateY(0)";

        });

        setTimeout(() => {

            toast.style.opacity = "0";

            toast.style.transform = "translateY(-15px)";

            setTimeout(() => {

                toast.remove();

            }, 400);

        }, 3000);

    }

    window.addEventListener("offline", () => {

        notify(
            "No internet connection.",
            "#ef4444"
        );

    });

    window.addEventListener("online", () => {

        notify(
            "Connection restored.",
            "#10b981"
        );

    });

    /* ==========================================================
       IMAGE ERROR HANDLER
       ========================================================== */

    document.querySelectorAll("img").forEach(img => {

        img.onerror = function () {

            this.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' fill='white' dominant-baseline='middle' text-anchor='middle'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";

        };

    });

    /* ==========================================================
       LAZY LOAD IMAGES
       ========================================================== */

    if ("IntersectionObserver" in window) {

        const lazyObserver =
            new IntersectionObserver(entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        const img = entry.target;

                        if (img.dataset.src) {

                            img.src = img.dataset.src;

                            img.removeAttribute("data-src");

                        }

                        lazyObserver.unobserve(img);

                    }

                });

            });

        document.querySelectorAll("img[data-src]")
            .forEach(img => {

                lazyObserver.observe(img);

            });

    }

    /* ==========================================================
       PAGE LOADER
       ========================================================== */

    window.addEventListener("load", () => {

        const loader =
            document.querySelector(".page-loader");

        if (loader) {

            loader.style.opacity = "0";

            setTimeout(() => {

                loader.remove();

            }, 500);

        }

    });

    /* ==========================================================
       CONSOLE MESSAGE
       ========================================================== */

    console.log(

        "%cAI Breast Cancer Detection Dashboard Loaded",

        "color:#06b6d4;font-size:18px;font-weight:bold;"

    );

    console.log(

        "Developed with Flask, TensorFlow, HTML, CSS and JavaScript."

    );

});