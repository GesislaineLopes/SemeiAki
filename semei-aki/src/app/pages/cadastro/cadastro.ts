import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, apiErrorMessage } from '../../services/auth';
import type { ProducerRegistration } from '../../services/auth';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss',
})
export class Cadastro {
  showPassword = false;
  message = '';
  submitting = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  submitSignup(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const data = new FormData(form);
    const registration: ProducerRegistration = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      phone: String(data.get('whatsapp') ?? ''),
      site: String(data.get('property') ?? ''),
      city: String(data.get('city') ?? ''),
      location: String(data.get('location') ?? ''),
      reference: String(data.get('reference') ?? ''),
    };

    this.submitting = true;
    this.message = '';
    this.auth.register(registration).subscribe({
      next: () => {
        this.submitting = false;
        this.changeDetector.markForCheck();
        void this.router.navigateByUrl(this.redirectUrl);
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.message = apiErrorMessage(error, 'Não foi possível criar a conta. Tente novamente.');
        this.changeDetector.markForCheck();
      },
    });
  }

  private get redirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    return redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/produtor';
  }
}
