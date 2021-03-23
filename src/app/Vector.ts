class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static multiply(vector: Vector, factor: number): Vector {
    return new Vector(vector.x * factor, vector.y * factor);
  }

  static add(vector1: Vector, vector2: Vector): Vector {
    return new Vector(vector1.x + vector2.x, vector1.y + vector2.y);
  }

  static subtract(vector1: Vector, vector2: Vector): Vector {
    return new Vector(vector1.x - vector2.x, vector1.y - vector2.y);
  }

  static dot(vector1: Vector, vector2: Vector): number {
    return vector1.x * vector2.x + vector1.y * vector2.y;
  }

  static avg(vectors: Vector[]): Vector {
    let x = 0;
    let y = 0;

    for (const vector of vectors) {
      x += vector.x;
      y += vector.y;
    }
    return new Vector(x / vectors.length, y / vectors.length);
  }
}

export {Vector};
