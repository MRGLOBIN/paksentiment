/* eslint-disable */

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match' })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args?: ValidationArguments): boolean {
    if (
      !args ||
      !args.constraints ||
      !args.constraints.length ||
      !args.object
    ) {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [relatedPropertyName] = args.constraints;

    // --- THIS IS THE FIX ---
    // We are sure 'args.object' exists because of the guard clause above.
    // We disable the linter rule for this one line because dynamic access is required.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const relatedValue = (args.object as any)[relatedPropertyName];

    return value === relatedValue;
  }

  defaultMessage(args?: ValidationArguments): string {
    if (!args || !args.constraints || !args.constraints.length) {
      return 'Fields must match';
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

// The Match function remains the same
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
