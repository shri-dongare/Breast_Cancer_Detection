(function () {
    "use strict";

    /* ============================================================
       DISMISS FLASH MESSAGES
    ============================================================ */
    document.querySelectorAll(".flash-dismiss").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var alertEl = btn.closest(".flash-alert");
            if (!alertEl) return;
            alertEl.style.transition = "opacity 0.25s ease, transform 0.25s ease";
            alertEl.style.opacity = "0";
            alertEl.style.transform = "translateY(-6px)";
            setTimeout(function () { alertEl.remove(); }, 250);
        });
    });

    /* ============================================================
       PASSWORD VISIBILITY TOGGLE
    ============================================================ */
    var toggleBtn = document.getElementById("toggle-password");
    var passwordInput = document.getElementById("password");

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener("click", function () {
            var isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            toggleBtn.setAttribute("aria-pressed", String(isHidden));
            toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
            toggleBtn.querySelector(".icon-eye").hidden = isHidden;
            toggleBtn.querySelector(".icon-eye-off").hidden = !isHidden;
        });
    }

    /* ============================================================
       CLIENT-SIDE VALIDATION
    ============================================================ */
    var form = document.getElementById("login-form");
    var submitBtn = document.getElementById("submit-btn");

    function setInvalid(fieldGroup, invalid) {
        fieldGroup.classList.toggle("invalid", invalid);
    }

    function validateField(input) {
        var fieldGroup = input.closest(".field-group");
        if (!fieldGroup) return true;

        var value = input.value.trim();
        var valid = true;

        if (input.hasAttribute("required") && value.length === 0) {
            valid = false;
        } else if (input.hasAttribute("minlength")) {
            var minLen = parseInt(input.getAttribute("minlength"), 10);
            if (value.length < minLen) valid = false;
        }

        setInvalid(fieldGroup, !valid);
        return valid;
    }

    if (form) {
        form.querySelectorAll(".input-field").forEach(function (input) {
            input.addEventListener("blur", function () { validateField(input); });
            input.addEventListener("input", function () {
                var fieldGroup = input.closest(".field-group");
                if (fieldGroup && fieldGroup.classList.contains("invalid")) {
                    validateField(input);
                }
            });
        });

        form.addEventListener("submit", function (e) {
            var inputs = form.querySelectorAll(".input-field");
            var allValid = true;

            inputs.forEach(function (input) {
                var ok = validateField(input);
                if (!ok) allValid = false;
            });

            if (!allValid) {
                e.preventDefault();
                var firstInvalid = form.querySelector(".field-group.invalid .input-field");
                if (firstInvalid) firstInvalid.focus();
                return;
            }

            if (submitBtn) {
                submitBtn.classList.add("loading");
                submitBtn.disabled = true;
            }
            // form submits normally to the Flask /login route
        });
    }

    /* ============================================================
       RIPPLE CLICK EFFECT
    ============================================================ */
    if (submitBtn) {
        submitBtn.addEventListener("click", function (e) {
            var rect = submitBtn.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);

            ripple.className = "ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";

            submitBtn.appendChild(ripple);
            setTimeout(function () { ripple.remove(); }, 650);
        });
    }

    /* ============================================================
       LIGHTWEIGHT AMBIENT PARTICLE BACKGROUND
       (skipped entirely if user prefers reduced motion)
    ============================================================ */
    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canvas = document.getElementById("particle-canvas");

    if (canvas && !prefersReducedMotion) {
        var ctx = canvas.getContext("2d");
        var particles = [];
        var particleCount = 34;
        var width, height;

        function resize() {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        }

        function createParticles() {
            particles = [];
            for (var i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: Math.random() * 1.6 + 0.6,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    a: Math.random() * 0.5 + 0.15
                });
            }
        }

        function tick() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(function (p) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(6, 182, 212, " + p.a + ")";
                ctx.fill();
            });
            requestAnimationFrame(tick);
        }

        window.addEventListener("resize", function () {
            resize();
            createParticles();
        });

        resize();
        createParticles();
        requestAnimationFrame(tick);
    }
})();
