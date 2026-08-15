/*!
 * Atlas Dominion — shared site behavior.
 * Progressive enhancement only: every page works with this file absent.
 */
(function () {
    'use strict';

    // ------------------------------------------------------------ mobile nav

    var toggle = document.querySelector('.nav__toggle');
    var links = document.getElementById('nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', function () {
            var open = links.getAttribute('data-open') === 'true';

            links.setAttribute('data-open', open ? 'false' : 'true');
            toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
            toggle.textContent = open ? 'Menu' : 'Close';
        });

        // Collapse when a link is followed, and on escape.
        links.addEventListener('click', function (event) {
            if (event.target.closest('a')) {
                links.setAttribute('data-open', 'false');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.textContent = 'Menu';
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') return;
            if (links.getAttribute('data-open') !== 'true') return;

            links.setAttribute('data-open', 'false');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.textContent = 'Menu';
            toggle.focus();
        });
    }

    // ---------------------------------------------------------- current year

    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });
})();
