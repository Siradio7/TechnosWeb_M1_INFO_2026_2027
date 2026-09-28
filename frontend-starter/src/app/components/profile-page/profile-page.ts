import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Composant de consultation et modification du profil utilisateur.
 * Charge automatiquement le profil via /api/users/me et permet de renommer
 * l'utilisateur avec mise à jour réactive du Signal currentUser.
 */
@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent {
  readonly auth = inject(AuthService);

  readonly success = signal('');
  readonly error = signal('');
  readonly loading = signal(false);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });

  constructor() {
    // Initialise le champ si l'utilisateur est déjà en mémoire locale
    const current = this.auth.currentUser();
    if (current) {
      this.form.setValue({ name: current.name });
    }
    // Charge immédiatement les données fraîches depuis le serveur
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.profile().subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil chargé', user.id);
        this.form.setValue({ name: user.name });
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[ProfilePage] Chargement impossible', error);
        this.error.set(error.error?.message ?? 'Impossible de charger le profil');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.success.set('');
    this.error.set('');

    this.auth.update(this.form.getRawValue().name).subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil enregistré', user.id);
        this.success.set('Nom mis à jour avec succès !');
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[ProfilePage] Enregistrement impossible', error);
        this.error.set(error.error?.message ?? 'Impossible de mettre à jour le profil');
        this.loading.set(false);
      },
    });
  }
}

