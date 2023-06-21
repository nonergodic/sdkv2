export class Address {
  protected address: string;

  constructor(address: string | Uint8Array | Buffer) {
    this.address = address.toString();
  }

  public toBuffer(): Buffer {
    return Buffer.from(this.address, "hex");
  }

  public toString(): string {
    return this.address;
  }

  public toUint8Array(): Uint8Array {
    return new Uint8Array(this.toBuffer());
  }
}
