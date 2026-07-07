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

export class NotFoundError extends DomainError {
  constructor(message = 'Nie znaleziono') {
    super('NOT_FOUND', message, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(code = 'FORBIDDEN', message = 'Brak uprawnień do tej operacji') {
    super(code, message, 403);
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

// Przejście stanu niezgodne z cyklem życia (optimistic locking na statusie).
export class InvalidTransitionError extends DomainError {
  constructor(message = 'Operacja niedozwolona w bieżącym statusie') {
    super('INVALID_TRANSITION', message, 409);
  }
}
