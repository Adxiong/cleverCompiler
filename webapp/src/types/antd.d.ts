import { ReactNode } from "react";

export interface FormFieldRule {
  enum?: string,
  len?: number,
  max?: number,
  message?: string|ReactNode,
  min?: number,
  pattern?: RegExp,
  required?: boolean,
  transform? (value: any): any,
  type?: string,
  validator?(rule: any, value: any, callback: Function): void,
  whitespace?: boolean
}
export interface FieldDecoratorOptions {
  rules?: Array<FormFieldRule>,
  validateFirst?: boolean,
  valuePropName?: string,
  initialValue?: any
}
export interface ValidateCallback {
  (err: Error, values: any): void
}
export interface FormProps {
  getFieldDecorator ?(id: string, options: FieldDecoratorOptions): Function,
  validateFields ?(callback: ValidateCallback): void
}