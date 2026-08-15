/*!
 * Atlas Dominion — merchant pre-application.
 *
 * Deliberately separate from contact.js rather than a shared abstraction. The
 * contact form is the primary revenue path and is working; refactoring it to
 * serve two callers risks that for the sake of avoiding ~80 duplicated lines.
 * If a third lead form ever appears, extract then.
 *
 * Collects nothing sensitive: no SSN, EIN, bank account or routing number.
 * Those go to the processor's own secure application, never through here.
 */
(function () {
    'use strict';

    var form = document.getElementById('merchant-application-form');
    if (!form) return;

    var LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];
    var isLocal = LOCAL_HOSTS.indexOf(location.hostname) !== -1;

    var ENDPOINT =
        (isLocal && form.getAttribute('data-endpoint-local')) ||
        form.getAttribute('data-endpoint') ||
        'https://admin.atlas-dominion.com/api/public/leads';

    var status = document.getElementById('ma-status');
    var submit = document.getElementById('ma-submit');
    var params = new URLSearchParams(location.search);
    var openedAt = Date.now();

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

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        clearErrors();

        var data = Object.fromEntries(new FormData(form).entries());

        Object.keys(data).forEach(function (key) {
            if (data[key] === '') delete data[key];
        });

        var payload = Object.assign(data, {
            intent: 'merchant-preapp',
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
                    setStatus(
                        'Thanks — we have what we need to give you an honest read. We will come '
                        + 'back within one business day with which processors fit and what pricing '
                        + 'is realistic.',
                        'success',
                        result.body.ref
                    );

                    if (window.atlasTrack) window.atlasTrack('form_submitted', { form: 'merchant-application', ref: result.body.ref });
                    if (window.atlasMarkSubmitted) window.atlasMarkSubmitted('merchant-application');

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

                setStatus('Something went wrong on our end. Please email us directly and we will pick it up.', 'error');
            })
            .catch(function () {
                setStatus('We could not reach the server. Please check your connection, or email us directly.', 'error');
            })
            .finally(function () {
                submit.disabled = false;
            });
    });
})();
