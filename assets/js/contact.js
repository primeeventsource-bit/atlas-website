/*!
 * Atlas Dominion — contact form.
 *
 * Posts to the intake endpoint on admin.atlas-dominion.com and renders the
 * response inline. Reads campaign context (intent, utm_*) from the URL and the
 * visitor cookie dropped by tracker.js, so a lead arrives fully attributed.
 *
 * The endpoint is read from the form's data-endpoint attribute, so a local
 * copy can point at http://localhost:8000 without editing this file.
 */
(function () {
    'use strict';

    var form = document.getElementById('contact-form');
    if (!form) return;

    // On localhost, prefer data-endpoint-local so a developer can point at a
    // backend on :8000 without editing (and later committing) the production URL.
    var LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];
    var isLocal = LOCAL_HOSTS.indexOf(location.hostname) !== -1;

    var ENDPOINT =
        (isLocal && form.getAttribute('data-endpoint-local')) ||
        form.getAttribute('data-endpoint') ||
        'https://admin.atlas-dominion.com/api/public/leads';

    // Intents that reveal the ISO / MCA pre-qualifier block.
    var PREQUALIFY_INTENTS = ['statement-audit', 'capital-preapproval'];

    var status = document.getElementById('form-status');
    var submit = document.getElementById('form-submit');
    var prequal = document.getElementById('prequalifiers');
    var intentField = document.getElementById('field-intent');

    var params = new URLSearchParams(location.search);
    var openedAt = Date.now();

    // ------------------------------------------------------------ intent

    function currentIntent() {
        return intentField && intentField.value ? intentField.value : 'general';
    }

    function syncPrequalifiers() {
        if (!prequal) return;

        var show = PREQUALIFY_INTENTS.indexOf(currentIntent()) !== -1;

        prequal.hidden = !show;

        // Never submit values the visitor can no longer see.
        if (!show) {
            prequal.querySelectorAll('input').forEach(function (input) { input.value = ''; });
        }
    }

    // Preselect from ?intent= when it names an option we actually offer.
    var urlIntent = (params.get('intent') || '').toLowerCase();

    if (intentField && urlIntent) {
        var match = Array.prototype.some.call(intentField.options, function (option) {
            return option.value === urlIntent;
        });

        if (match) intentField.value = urlIntent;
    }

    if (intentField) intentField.addEventListener('change', syncPrequalifiers);

    syncPrequalifiers();

    // ------------------------------------------------------------ helpers

    function cookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function clearErrors() {
        form.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach(function (el) {
            el.removeAttribute('aria-invalid');
        });
    }

    function showErrors(errors) {
        Object.keys(errors).forEach(function (field) {
            var target = form.querySelector('[data-error-for="' + field + '"]');
            var input = form.querySelector('[name="' + field + '"]');

            if (target) target.textContent = errors[field][0];
            if (input) input.setAttribute('aria-invalid', 'true');
        });

        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
    }

    function setStatus(message, kind, ref) {
        status.className = 'form-status' + (kind ? ' form-status--' + kind : '');
        status.textContent = message;

        if (ref) {
            var tag = document.createElement('span');
            tag.className = 'form-status__ref';
            tag.textContent = 'Reference ' + ref;
            status.appendChild(tag);
        }
    }

    // ------------------------------------------------------------- submit

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        clearErrors();

        var data = Object.fromEntries(new FormData(form).entries());

        // Send absent optional fields as absent, not as empty strings.
        Object.keys(data).forEach(function (key) {
            if (data[key] === '') delete data[key];
        });

        var payload = Object.assign(data, {
            intent: currentIntent(),
            source_page: location.href,
            referrer: document.referrer || null,
            utm_source: params.get('utm_source'),
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            utm_content: params.get('utm_content'),
            utm_term: params.get('utm_term'),
            visitor_cookie: cookie('atlas_vid'),
            form_elapsed_seconds: Math.round((Date.now() - openedAt) / 1000)
        });

        submit.disabled = true;
        setStatus('Sending…');

        fetch(ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.json()
                    .catch(function () { return {}; })
                    .then(function (body) { return { status: response.status, body: body }; });
            })
            .then(function (result) {
                if (result.status === 201 && result.body.ok) {
                    form.reset();
                    syncPrequalifiers();
                    setStatus(result.body.message, 'success', result.body.ref);

                    // Tell the tracker this completed so it isn't logged as abandoned.
                    if (window.atlasTrack) window.atlasTrack('form_submitted', { ref: result.body.ref });
                    if (window.atlasMarkSubmitted) window.atlasMarkSubmitted('contact');

                    status.focus();
                    return;
                }

                if (result.status === 422 && result.body.errors) {
                    showErrors(result.body.errors);
                    setStatus('Please check the highlighted fields.', 'error');
                    return;
                }

                if (result.status === 429) {
                    setStatus(
                        result.body.message || 'Too many submissions. Please try again in a minute.',
                        'error'
                    );
                    return;
                }

                setStatus(
                    'Something went wrong on our end. Please email us directly and we will pick it up.',
                    'error'
                );
            })
            .catch(function () {
                setStatus(
                    'We could not reach the server. Please check your connection, or email us directly.',
                    'error'
                );
            })
            .finally(function () {
                submit.disabled = false;
            });
    });
})();
