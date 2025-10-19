import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match' })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(
    value: any,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> | boolean {
    const [relatedPropertyName] = validationArguments?.constraints;
    const realatedValue = validationArguments?.object[relatedPropertyName];
    return value == realatedValue;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    const [relatedPropertyName] = validationArguments?.constraints;
    return `${validationArguments?.property} must match ${relatedPropertyName}`;
  }
}

export function Match(property: string, valdationOption: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: valdationOption,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
