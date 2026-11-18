
(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('registerForm');
      const feedback = document.getElementById('registerFeedback');

      if (!form) {
          console.error('Registration form #registerForm was not found.');
          return;
      }

      const submitButton = form.querySelector('button[type="submit"]');

      function showFeedback(message, type = 'error') {
          if (!feedback) {
              alert(message);
              return;
          }

          feedback.textContent = message;
          feedback.className = `form-feedback ${type}`;
          feedback.style.display = 'block';
          feedback.style.visibility = 'visible';
          feedback.style.opacity = '1';
          feedback.style.minHeight = '20px';
      }

      function getValue(id) {
          return document.getElementById(id)?.value.trim() || '';
      }

      form.addEventListener('submit', async (event) => {
          event.preventDefault();

          if (feedback) {
              feedback.textContent = '';
              feedback.className = 'form-feedback';
          }

          if (!form.reportValidity()) {
              return;
          }

          const originalButtonHTML =
              submitButton?.innerHTML || 'Create account';

          if (submitButton) {
              submitButton.disabled = true;
              submitButton.textContent = 'Creating account...';
          }

          const payload = {
              full_name: getValue('name'),
              email: getValue('email'),
              phone: getValue('phone'),
              password: document.getElementById('newPassword')?.value || ''
          };

          try {
              // Send registration data to the existing PHP API.
              const response = await fetch('api/auth.php?action=register', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                  },
                  body: JSON.stringify(payload)
              });

              const responseText = await response.text();

              let result;

              try {
                  result = JSON.parse(responseText);
              } catch (error) {
                  console.error('Invalid API response:', responseText);

                  throw new Error(
                      `Server returned an invalid response (${response.status}). Check the PHP error log.`
                  );
              }

              if (!response.ok || !result.success) {
                  throw new Error(
                      result.message || `Registration failed (${response.status}).`
                  );
              }

              showFeedback(
                  'Account created successfully! Redirecting to your account...',
                  'success'
              );

              if (submitButton) {
                  submitButton.textContent = 'Account created!';
              }

              // Open the account dashboard after successful registration.
              window.location.href = 'account.php';

          } catch (error) {
              console.error('Registration error:', error);

              showFeedback(
                  error.message ||
                  'Could not create your account. Please check your connection and try again.',
                  'error'
              );

              if (submitButton) {
                  submitButton.disabled = false;
                  submitButton.innerHTML = originalButtonHTML;
              }
          }
      });
  });
})();
