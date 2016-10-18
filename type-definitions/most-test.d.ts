
declare module "most-test" {

    import { Stream } from 'most'

    export const run: <T>(stream: Stream<T>) => TestEnvironment<T>;

    type Time = Number;
    type Interval = Number;

    type TestEnvironment<T> = {
        tick: (min?: Interval) => Promise<Result<T>>;
        now: Time;
        results: Result<T>[];
    }

    type Result<T> = {
        events: Array<T>;
        end?: true;
        error?: Error;
    }
}
