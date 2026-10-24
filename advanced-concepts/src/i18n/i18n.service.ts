import { Inject, Injectable, Scope } from '@nestjs/common';
import en from '../assets/locales/en.json' with { type: 'json' };
import ua from '../assets/locales/ua.json' with { type: 'json' };
import { REQUEST } from '@nestjs/core';
import format from 'string-format';

type Schema = typeof en;

type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[]> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? `${F}.${Join<Extract<R, string[]>>}`
        : never
      : string;

@Injectable({ scope: Scope.REQUEST, durable: true })
export class I18nService {
  public static readonly defaultLanguage = 'en';
  public static readonly supportedLanguages = ['en', 'ua'];
  private readonly locales: Record<string, Schema> = { en, ua };

  constructor(
    @Inject(REQUEST) private readonly payload: { localeCode: string },
  ) {}

  translate(
    key: Join<PathsToStringProps<Schema>>,
    ...args: Array<string | Record<string, unknown>>
  ): string {
    const locale =
      this.locales[this.payload.localeCode ?? I18nService.defaultLanguage];

    // To support dot notation: "ERRORS.USER_NOT_FOUND"
    const text: string = key
      .split('.')
      .reduce((o: any, i) => o?.[i], locale) as unknown as string;
    return format(text, ...args);
  }
}
