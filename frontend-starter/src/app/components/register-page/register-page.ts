import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Composant d'inscription d'un nouvel utilisateur.
 * Valide les champs requis selon les contraintes de l'API (mot de passe >= 8 caractères, nom >= 2 caractères).
 */
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal('');
  readonly loading = signal(false);
  
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const values = this.form.getRawValue();

    this.auth.register(values.name, values.email, values.password).subscribe({
      next: () => {
        console.debug('[RegisterPage] Inscription réussie');
        this.loading.set(false);
        void this.router.navigateByUrl('/profile');
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[RegisterPage] Échec de l’inscription', error);
        this.loading.set(false);
        this.error.set(error.error?.message ?? 'Erreur d’inscription');
      },
    });
  }
}

