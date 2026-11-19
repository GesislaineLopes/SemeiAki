import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, apiErrorMessage } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  showPassword = false;
  message = '';
  submitting = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  submitLogin(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const data = new FormData(form);
    this.submitting = true;
    this.message = '';
    this.auth
      .login(
        String(data.get('email') ?? ''),
        String(data.get('password') ?? ''),
        data.has('remember'),
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          this.changeDetector.markForCheck();
          void this.router.navigateByUrl(this.redirectUrl);
        },
        error: (error: unknown) => {
          this.submitting = false;
          this.message = apiErrorMessage(error, 'Não foi possível entrar. Tente novamente.');
          this.changeDetector.markForCheck();
        },
      });
  }

  private get redirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    return redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/produtor';
  }
}
