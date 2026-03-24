export class PolicyGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyGraphError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PolicyGraphNotFoundError extends PolicyGraphError {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyGraphNotFoundError';
  }
}

export class PolicyGraphVersionConflictError extends PolicyGraphError {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyGraphVersionConflictError';
  }
}

export class PolicyGraphNodeNotFoundError extends PolicyGraphError {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyGraphNodeNotFoundError';
  }
}
