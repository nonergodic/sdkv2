export class Address {
  protected address: Uint8Array;

  constructor(address: Uint8Array | Buffer) {
    this.address = new Uint8Array(address);
  }

  public toBuffer(): Buffer {
    return Buffer.from(this.address);
  }

  public toString(): string {
    return this.address.toString();
  }

  public toUint8Array(): Uint8Array {
    return this.address;
  }
}
