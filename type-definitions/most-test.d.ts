
declare module "most-test" {

    import { Stream } from 'most'

    type Time = Number;
    type Interval = Number;
 
    export class TestEnvironment {

        readonly now: Time;

        constructor();

        tick<T>( ms?: Interval ): this;
        track( ...streams: Stream<any>[] ): this;
        collect<T>( stream: Stream<T> ): Promise<Result<T>>;
        results<T>( stream: Stream<T> ): Result<T>[];
        reset(): void;
    }

    type Result<T> = {
        events: T[];
        end?: true | { value: T };
        error?: Error;
    }

    export class BasicTestEnvironment<T> {

        readonly now: Time;
        readonly results: Result<T>[];

        constructor( stream: Stream<T> );

        tick<T>( ms?: Interval ): Promise<Result<T>>;
    }

    export function run<T>( stream: Stream<T> ): BasicTestEnvironment<T>;

    class Sink<T> {
        buckets: Bucket<T>[];
        t: Time;
        events: [string, Time, any][];
        index: number;
        next( t: Time ): Bucket<T>;
        event( t: Time, x: T );
        end( t: Time, x: T );
        error( t: Time, err: Error );
    }

    class Bucket<T> {
        events: T[];
        end: true | { value: T };
        error: Error;
        toObject(): Result<T>;
    }
}
