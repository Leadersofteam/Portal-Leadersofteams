// Błędy domenowe mapowane na odpowiedzi HTTP w jednym miejscu (server.ts).
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class EmailTakenError extends DomainError {
  constructor() {
    super('EMAIL_TAKEN', 'Konto z tym adresem e-mail już istnieje', 409);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Nieprawidłowy e-mail lub hasło', 401);
  }
}

export class UnauthorizedError extends DomainError {
  constructor() {
    super('UNAUTHORIZED', 'Wymagane zalogowanie', 401);
  }
}
