/**
 * ============================================================================
 * static/js/register.js
 * AI Breast Cancer Detection — Register Page Controller
 * ----------------------------------------------------------------------------
 * Vanilla ES6+, zero dependencies. Mirrors the interaction language of
 * static/js/login.js so Register feels identical in polish to Login.
 *
 * Expected DOM contract (templates/register.html + static/css/register.css).
 * Every lookup below is null-safe — missing elements simply disable that
 * feature instead of throwing, so partial markup never crashes the page.
 *
 *   Layout / chrome
 *     .floating-nav                       sticky nav, gets `.scrolled` on scroll
 *     #scroll-progress                    fixed top progress bar (width driven by scroll %)
 *     .ambient-bg, .blob-a, .blob-b        parallax background blobs
 *     #particle-canvas                    canvas for ambient particle field
 *     [data-tilt]                         cards that tilt toward the cursor
 *     .reveal[data-reveal="fade-up|slide-left|slide-right|scale"]  scroll reveals
 *
 *   Form: #register-form
 *     input#username        field-group[data-field="username"]
 *     input#email            field-group[data-field="email"]
 *     input#password          field-group[data-field="password"]
 *     input#confirm-password field-group[data-field="confirm-password"]
 *     input#terms (checkbox) field-group[data-field="terms"]           (optional)
 *
 *   Password strength: #password-strength
 *     .strength-fill (bar), .strength-label (text)
 *
 *   Password requirement checklist: [data-requirement="length|uppercase|lowercase|number|special"]
 *     toggled with class `.met`
 *
 *   Confirm password match indicator: #confirm-password-match
 *
 *   Password visibility: #toggle-password, #toggle-confirm-password
 *     each containing .icon-eye / .icon-eye-off
 *
 *   Submit: #submit-btn > .btn-label, .btn-spinner
 *
 *   Flash messages: .flash-stack > .flash-alert > .flash-dismiss
 *
 *   Ripple-enabled controls: .ripple-target (submit button, oauth buttons, etc.)
 * ============================================================================
 */
(() => {
    "use strict";

    /* ==========================================================================
       1. STRICT MODE / GLOBAL GUARDS
       ========================================================================== */
    const supportsIO = "IntersectionObserver" in window;
    const prefersReducedMotion = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = () =>
        window.matchMedia("(pointer: fine)").matches;

    /* ==========================================================================
       2. DOM CACHE
       ========================================================================== */
    const dom = {};

    const cacheDom = () => {
        dom.nav = document.querySelector(".floating-nav");
        dom.scrollProgress = document.getElementById("scroll-progress");

        dom.ambientBg = document.querySelector(".ambient-bg");
        dom.blobA = document.querySelector(".blob-a");
        dom.blobB = document.querySelector(".blob-b");
        dom.particleCanvas = document.getElementById("particle-canvas");

        dom.tiltCards = Array.from(document.querySelectorAll("[data-tilt]"));
        dom.revealEls = Array.from(document.querySelectorAll(".reveal"));

        dom.form = document.getElementById("register-form");
        dom.username = document.getElementById("username");
        dom.email = document.getElementById("email");
        dom.password = document.getElementById("password");
        dom.confirmPassword = document.getElementById("confirm-password");
        dom.terms = document.getElementById("terms");

        dom.strengthContainer = document.getElementById("password-strength");
        dom.strengthFill = document.getElementById("strengthProgress");
        dom.strengthLabel = document.getElementById("strengthText");

        // DEBUG LOGS
        console.log("strengthContainer =", dom.strengthContainer);
        console.log("strengthFill =", dom.strengthFill);
        console.log("strengthLabel =", dom.strengthLabel);
        console.log("password =", dom.password);

        dom.requirements = Array.from(
            document.querySelectorAll("[data-requirement]")
        );

        dom.confirmMatch = document.getElementById("confirm-password-match");

        dom.togglePassword = document.getElementById("toggle-password");
        dom.toggleConfirmPassword = document.getElementById("toggle-confirm-password");

        dom.submitBtn = document.getElementById("submit-btn");
        dom.submitLabel = dom.submitBtn
            ? dom.submitBtn.querySelector(".btn-label")
            : null;

        dom.flashStack = document.querySelector(".flash-stack");

        dom.rippleTargets = Array.from(
            document.querySelectorAll(".ripple-target")
        );
    };

    /* ==========================================================================
       3. UTILITY FUNCTIONS
       ========================================================================== */
    const debounce = (fn, wait = 200) => {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    };

    const rafThrottle = (fn) => {
        let ticking = false;
        return (...args) => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                fn(...args);
                ticking = false;
            });
        };
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const setFieldState = (input, state) => {
        // state: 'valid' | 'invalid' | null
        const group = input.closest(".form-group");
        if (!group) return;
        group.classList.remove("valid", "invalid");
        if (state) group.classList.add(state);
    };

    const shakeElement = (el) => {
        if (!el || prefersReducedMotion()) return;
        el.classList.remove("shake");
        // Force reflow so the animation can retrigger on repeated invalid submits.
        void el.offsetWidth;
        el.classList.add("shake");
    };

    const animateCount = ({ start = 0, end, duration = 900, onUpdate }) => {
        if (prefersReducedMotion()) {
            onUpdate(end);
            return;
        }
        const startTime = performance.now();
        const step = (now) => {
            const progress = clamp((now - startTime) / duration, 0, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            onUpdate(start + (end - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    /* ==========================================================================
       4. FORM VALIDATION
       ========================================================================== */
    const VALIDATION = {
        username: {
            min: 3,
            max: 20,
            pattern: /^[a-zA-Z0-9_]+$/,
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
    };

    const validateUsername = () => {
        const input = dom.username;
        if (!input) return true;

        const value = input.value.trim();
        const rules = VALIDATION.username;
        const isValid =
            value.length >= rules.min &&
            value.length <= rules.max &&
            rules.pattern.test(value);

        setFieldState(input, value.length === 0 ? null : isValid ? "valid" : "invalid");
        return isValid && value.length > 0;
    };

    const validateEmail = () => {
        const input = dom.email;
        if (!input) return true;

        const value = input.value.trim();
        const isValid = VALIDATION.email.pattern.test(value);

        setFieldState(input, value.length === 0 ? null : isValid ? "valid" : "invalid");
        return isValid;
    };

    const getPasswordChecks = (value) => ({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        special: /[^A-Za-z0-9]/.test(value),
    });

    const updateRequirementChecklist = (checks) => {
        dom.requirements.forEach((item) => {
            const key = item.getAttribute("data-requirement");
            const met = Boolean(checks[key]);

            item.classList.toggle("met", met);
            item.setAttribute("aria-checked", String(met));

            const icon = item.querySelector(".requirement-icon i");

            if (icon) {
                if (met) {
                    icon.className = "ri-check-line";
                } else {
                    icon.className = "ri-checkbox-blank-circle-line";
                }
            }
        });
    };

    const validatePassword = () => {
        console.log("1");

        const input = dom.password;
        if (!input) return true;

        console.log("2");

        const value = input.value;
        const checks = getPasswordChecks(value);

        console.log("3", checks);

        updateRequirementChecklist(checks);

        console.log("4");

        const isValid = Object.values(checks).every(Boolean);

        console.log("5");

        setFieldState(input, value.length === 0 ? null : isValid ? "valid" : "invalid");

        console.log("6");

        updatePasswordStrength(value, checks);

        console.log("7");

        validateConfirmPassword();

        console.log("8");

        return isValid;
    };
    const validateConfirmPassword = () => {
        const input = dom.confirmPassword;
        if (!input || !dom.password) return true;

        const value = input.value;
        const matches = value.length > 0 && value === dom.password.value;

        if (dom.confirmMatch) {
            dom.confirmMatch.textContent = value.length === 0
                ? ""
                : matches
                    ? "Passwords match"
                    : "Passwords don't match";
            dom.confirmMatch.classList.toggle("match", matches);
            dom.confirmMatch.classList.toggle("mismatch", value.length > 0 && !matches);
        }

        setFieldState(input, value.length === 0 ? null : matches ? "valid" : "invalid");
        return matches;
    };

    const validateTerms = () => {
        if (!dom.terms) return true;
        const isValid = dom.terms.checked;
        const group = dom.terms.closest(".form-group");
        if (group) group.classList.toggle("invalid", !isValid);
        return isValid;
    };

    const validateAll = () => {
        const results = [
            validateUsername(),
            validateEmail(),
            validatePassword(),
            validateConfirmPassword(),
            validateTerms(),
        ];
        return results.every(Boolean);
    };

    const bindLiveValidation = () => {
        const debouncedUsername = debounce(validateUsername, 150);
        const debouncedEmail = debounce(validateEmail, 200);

        if (dom.username) {
            dom.username.addEventListener("input", debouncedUsername);
            dom.username.addEventListener("blur", validateUsername);
        }
        if (dom.email) {
            dom.email.addEventListener("input", debouncedEmail);
            dom.email.addEventListener("blur", validateEmail);
        }
        if (dom.password) {
            dom.password.addEventListener("input", validatePassword);
            dom.password.addEventListener("blur", validatePassword);
        }
        if (dom.confirmPassword) {
            dom.confirmPassword.addEventListener("input", validateConfirmPassword);
            dom.confirmPassword.addEventListener("blur", validateConfirmPassword);
        }
        if (dom.terms) {
            dom.terms.addEventListener("change", validateTerms);
        }
    };

    /* ==========================================================================
       5. PASSWORD STRENGTH
       ========================================================================== */
    const STRENGTH_LEVELS = [
        { label: "Weak", className: "weak", min: 0 },
        { label: "Medium", className: "medium", min: 2 },
        { label: "Strong", className: "strong", min: 4 },
        { label: "Very Strong", className: "very-strong", min: 5 },
    ];

    const scorePassword = (value, checks) => {
        if (!value) return 0;
        let score = Object.values(checks).filter(Boolean).length;
        if (value.length >= 12) score += 1; // bonus for generous length
        return clamp(score, 0, 5);
    };

    const getStrengthLevel = (score) =>
        [...STRENGTH_LEVELS].reverse().find((level) => score >= level.min) ||
        STRENGTH_LEVELS[0];

    const updatePasswordStrength = (value, checks) => {
        console.log("strengthFill =", dom.strengthFill);
        console.log("strengthLabel =", dom.strengthLabel);

        if (!dom.strengthContainer) return;

        const score = scorePassword(value, checks);
        const level = getStrengthLevel(score);
        const percent = value.length === 0 ? 0 : Math.min((score / 5) * 100, 100);

        console.log("percent =", percent);

        if (dom.strengthFill) {
            dom.strengthFill.style.width = `${percent}%`;
        }

        if (dom.strengthLabel) {
            dom.strengthLabel.textContent = value.length === 0 ? "" : level.label;
        }

        STRENGTH_LEVELS.forEach((lvl) =>
            dom.strengthFill.classList.remove(lvl.className)
        );

        if (value.length > 0)
            dom.strengthFill.classList.add(level.className);

        dom.strengthContainer.setAttribute(
            "aria-label",
            value.length === 0
                ? "Password strength"
                : `Password strength: ${level.label}`
        );
    };
    /* ==========================================================================
       6. PASSWORD TOGGLE (show / hide, no layout shift)
       ========================================================================== */
    const bindPasswordToggle = (button, input) => {
        if (!button || !input) return;

        const eyeIcon = button.querySelector(".icon-eye");
        const eyeOffIcon = button.querySelector(".icon-eye-off");

        button.addEventListener("click", () => {
            const isHidden = input.type === "password";
            input.type = isHidden ? "text" : "password";

            button.setAttribute("aria-pressed", String(isHidden));
            button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

            if (eyeIcon) eyeIcon.hidden = isHidden;
            if (eyeOffIcon) eyeOffIcon.hidden = !isHidden;

            input.focus({ preventScroll: true });
        });
    };

    /* ==========================================================================
       7. CONFIRM PASSWORD
       (logic lives in validateConfirmPassword — kept here per section ordering
        for anyone scanning the file top-to-bottom)
       ========================================================================== */

    /* ==========================================================================
       8. RIPPLE EFFECT
       ========================================================================== */
    const createRipple = (event, target) => {
        if (prefersReducedMotion()) return;

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement("span");

        ripple.className = "ripple";
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

        target.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
        // Safety net in case animationend doesn't fire (e.g. display changes mid-flight).
        setTimeout(() => ripple.remove(), 800);
    };

    const bindRippleEffects = () => {
        dom.rippleTargets.forEach((target) => {
            target.style.position = target.style.position || "relative";
            target.style.overflow = "hidden";
            target.addEventListener("click", (event) => createRipple(event, target));
        });
    };

    /* ==========================================================================
       9. FLASH MESSAGES
       ========================================================================== */
    const AUTO_DISMISS_MS = 6000;

    const dismissFlash = (alertEl) => {
        if (!alertEl || alertEl.dataset.dismissing === "true") return;
        alertEl.dataset.dismissing = "true";
        alertEl.classList.add("flash-leaving");
        window.setTimeout(() => alertEl.remove(), 300);
    };

    const bindFlashMessage = (alertEl) => {
        let timer = null;

        const startTimer = () => {
            timer = window.setTimeout(() => dismissFlash(alertEl), AUTO_DISMISS_MS);
        };
        const stopTimer = () => {
            if (timer) window.clearTimeout(timer);
        };

        alertEl.classList.add("flash-entering");
        requestAnimationFrame(() => alertEl.classList.remove("flash-entering"));

        alertEl.addEventListener("mouseenter", stopTimer, { passive: true });
        alertEl.addEventListener("mouseleave", startTimer, { passive: true });

        const dismissBtn = alertEl.querySelector(".flash-dismiss");
        if (dismissBtn) {
            dismissBtn.addEventListener("click", () => {
                stopTimer();
                dismissFlash(alertEl);
            });
        }

        startTimer();
    };

    const initFlashMessages = () => {
        if (!dom.flashStack) return;
        const alerts = Array.from(dom.flashStack.querySelectorAll(".flash-alert"));
        alerts.forEach(bindFlashMessage);
    };

    const dismissAllFlashes = () => {
        if (!dom.flashStack) return;
        dom.flashStack.querySelectorAll(".flash-alert").forEach(dismissFlash);
    };

    /* ==========================================================================
       10. BACKGROUND ANIMATIONS (blobs, parallax, particles)
       ========================================================================== */
    const initParallax = () => {
        if (!dom.ambientBg || prefersReducedMotion() || !isFinePointer()) return;

        const handleMove = rafThrottle((event) => {
            const { innerWidth, innerHeight } = window;
            const relX = (event.clientX / innerWidth - 0.5) * 2; // -1..1
            const relY = (event.clientY / innerHeight - 0.5) * 2;

            if (dom.blobA) {
                dom.blobA.style.transform = `translate3d(${relX * 16}px, ${relY * 12}px, 0)`;
            }
            if (dom.blobB) {
                dom.blobB.style.transform = `translate3d(${relX * -20}px, ${relY * -14}px, 0)`;
            }
        });

        window.addEventListener("mousemove", handleMove, { passive: true });
    };

    const initParticles = () => {
        if (!dom.particleCanvas || prefersReducedMotion()) return;

        const canvas = dom.particleCanvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let particles = [];
        const PARTICLE_COUNT = 32;

        const resize = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        };

        const seedParticles = () => {
            particles = Array.from({ length: PARTICLE_COUNT }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 1.6 + 0.6,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                a: Math.random() * 0.5 + 0.15,
            }));
        };

        const tick = () => {
            ctx.clearRect(0, 0, width, height);
            particles.forEach((p) => {
                p.x = (p.x + p.vx + width) % width;
                p.y = (p.y + p.vy + height) % height;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(6, 182, 212, ${p.a})`;
                ctx.fill();
            });
            requestAnimationFrame(tick);
        };

        window.addEventListener(
            "resize",
            debounce(() => {
                resize();
                seedParticles();
            }, 150)
        );

        resize();
        seedParticles();
        requestAnimationFrame(tick);
    };

    const initTiltCards = () => {
        if (prefersReducedMotion() || !isFinePointer()) return;

        dom.tiltCards.forEach((card) => {
            const maxTilt = 6; // degrees — kept subtle by design

            const handleMove = rafThrottle((event) => {
                const rect = card.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width; // 0..1
                const py = (event.clientY - rect.top) / rect.height;

                const rotateY = (px - 0.5) * maxTilt * 2;
                const rotateX = (0.5 - py) * maxTilt * 2;

                card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            const reset = () => {
                card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
            };

            card.addEventListener("mousemove", handleMove, { passive: true });
            card.addEventListener("mouseleave", reset, { passive: true });
        });
    };

    /* ==========================================================================
       11. INTERSECTION OBSERVER (scroll reveals)
       ========================================================================== */
    const initScrollReveals = () => {
        if (dom.revealEls.length === 0) return;

        if (!supportsIO || prefersReducedMotion()) {
            dom.revealEls.forEach((el) => el.classList.add("in-view"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("in-view");
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
        );

        dom.revealEls.forEach((el) => observer.observe(el));
    };

    /* ==========================================================================
       12. EVENT LISTENERS (nav, scroll progress, keyboard, submit)
       ========================================================================== */
    const initScrollChrome = () => {
        if (!dom.nav && !dom.scrollProgress) return;

        const update = rafThrottle(() => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;

            if (dom.nav) {
                dom.nav.classList.toggle("scrolled", scrollTop > 10);
            }

            if (dom.scrollProgress) {
                const docHeight =
                    document.documentElement.scrollHeight - window.innerHeight;
                const percent = docHeight > 0 ? clamp((scrollTop / docHeight) * 100, 0, 100) : 0;
                dom.scrollProgress.style.width = `${percent}%`;
            }
        });

        window.addEventListener("scroll", update, { passive: true });
        update();
    };

    const initKeyboardShortcuts = () => {
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") dismissAllFlashes();
        });
    };

    const setSubmitLoading = (isLoading) => {
        if (!dom.submitBtn) return;

        dom.submitBtn.disabled = isLoading;
        dom.submitBtn.classList.toggle("loading", isLoading);

        if (dom.submitLabel) {
            dom.submitLabel.textContent = isLoading ? "Creating account…" : "Create account";
        }
    };

    const focusFirstInvalidField = () => {
        const firstInvalidGroup = document.querySelector(".form-group.invalid");
        if (!firstInvalidGroup) return;
        const input = firstInvalidGroup.querySelector("input");
        if (input) input.focus({ preventScroll: false });
    };

    const bindFormSubmit = () => {
        if (!dom.form) return;

        let isSubmitting = false;

        dom.form.addEventListener("submit", (event) => {
            const isValid = validateAll();

            if (!isValid) {
                event.preventDefault();
                shakeElement(dom.form.closest(".auth-card") || dom.form);
                focusFirstInvalidField();
                return;
            }

            if (isSubmitting) {
                // Guard against double submission (double click / enter spam).
                event.preventDefault();
                return;
            }

            isSubmitting = true;
            setSubmitLoading(true);
            if (dom.submitBtn) dom.submitBtn.classList.add("success");
            // No preventDefault here — the browser proceeds with the normal
            // Flask POST to the register route.
        });
    };

    /* ==========================================================================
       13. INITIALIZATION
       ========================================================================== */
    const safeInit = (label, fn) => {
        try {
            fn();
        } catch (error) {
            // Never let one broken feature take the whole page down.
            // eslint-disable-next-line no-console
            console.warn(`[register.js] "${label}" failed to initialize:`, error);
        }
    };

    const init = () => {
        cacheDom();
        updatePasswordStrength("", getPasswordChecks(""));

        safeInit("live validation", bindLiveValidation);
        safeInit("password toggles", () => {
            bindPasswordToggle(dom.togglePassword, dom.password);
            bindPasswordToggle(dom.toggleConfirmPassword, dom.confirmPassword);
        });
        safeInit("ripple effects", bindRippleEffects);
        safeInit("flash messages", initFlashMessages);
        safeInit("parallax background", initParallax);
        safeInit("particle field", initParticles);
        safeInit("tilt cards", initTiltCards);
        safeInit("scroll reveals", initScrollReveals);
        safeInit("scroll chrome", initScrollChrome);
        safeInit("keyboard shortcuts", initKeyboardShortcuts);
        safeInit("form submission", bindFormSubmit);

        if (dom.form) {
            requestAnimationFrame(() => dom.form.closest(".auth-card")?.classList.add("card-ready"));
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();