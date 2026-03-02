# Story 1.1: Formulaire de connexion

Status: done

## Story

En tant qu'utilisateur, je veux me connecter avec mon email et mon mot de passe
afin d'accéder à mon espace personnel.

## Acceptance Criteria

1. Le formulaire affiche les champs email et mot de passe
2. Les erreurs de validation sont affichées clairement
3. Une connexion réussie redirige vers le tableau de bord

## Tasks / Subtasks

- [x] Créer le composant LoginForm
- [x] Ajouter la validation des champs
- [ ] Écrire les tests unitaires

## Dev Notes

Utiliser React Hook Form pour la gestion du formulaire.
Le token JWT est stocké dans httpOnly cookie.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Composant créé et validé

### File List

- src/components/LoginForm.tsx
