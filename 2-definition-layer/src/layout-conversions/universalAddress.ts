import { CustomConversion } from 'wormhole-base';
import { UniversalAddress } from '../universalAddress';

export const universalAddressConversion = {
  to: (val: Uint8Array): UniversalAddress => new UniversalAddress(val),
  from: (val: UniversalAddress): Uint8Array => val.toUint8Array(),
} as const satisfies CustomConversion<Uint8Array, UniversalAddress>;
