// ===========================================================
//                  Async Utils
// ===========================================================


var time = 0;
var deltaTime = 0;
var updateResolve = (_: unknown) => {};
var updatePromise = new Promise((resolve) => {
    updateResolve = resolve;
});


export class CancellationToken {
    cancellationPromise: Promise<object>
    _cancel: (e: unknown) => void = (_) => {};
    isCancellationRequested: boolean = false;

    constructor(parentToken: CancellationToken | null = null) {
        this.cancellationPromise = new Promise(resolve => {
            this._cancel = (e: unknown) => {
                this.isCancellationRequested = true;
                if (e) {
                    resolve(e);
                } else {
                    var err = new Error("cancelled");
                    resolve(err);
                }
            }
        });
        if (parentToken && parentToken instanceof CancellationToken) {
            parentToken.register(this._cancel);
        }
    }

    register(callback: (e: unknown) => void) {
        this.cancellationPromise.then(callback);
    }

    createDependentToken() {
        return new CancellationToken(this);
    }

    cancel() {
        this._cancel(0);
    }

}

export function getTime() {
  return time;
}

class OperationCanceledError extends Error {
    constructor() {
        super("処理がキャンセルされました");
        this.name = "OperationCanceledError";
    }
}

export async function update(deltaTime: number){
    time += deltaTime / 60.0;
    var previousResolve = updateResolve;
    updatePromise = new Promise((resolve) => {
        updateResolve = resolve;
    });
    previousResolve(null);
} 

export async function delayFrame(frameCount: number, cancellationToken: CancellationToken | null = null) {
  var count = 0;
  const start = time;
  while (true){
      if (cancellationToken && cancellationToken.isCancellationRequested) {
          throw new OperationCanceledError();
      }
      if (count >= frameCount){
          return time - start;
      }
      await updatePromise
      count += 1;
  }
}

export async function delay(seconds: number, cancellationToken: CancellationToken | null = null) {
    var start = time;
    while(true) {
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            throw new OperationCanceledError();
        }
        if(time - start >= seconds) {
            return;
        }
        await updatePromise
    }
}

export async function delayMillisecondes(milli: number, cancellationToken: CancellationToken | null = null) {
    await delay(milli / 1000);
}

export async function waitUntil(func: () => boolean, cancellationToken: CancellationToken | null = null) {
    while(true) {
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            throw new OperationCanceledError();
        }
        if(func()) {
            return;
        }
        await updatePromise
    }
}

export async function waitWhile(func: () => boolean, cancellationToken: CancellationToken | null = null) {
    while(true) {
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            throw new OperationCanceledError();
        }
        if(!func()) {
            return;
        }
        await updatePromise
    }
}

export async function waitChange<T>(getter: () => T, cancellationToken: CancellationToken | null = null) {
    const val = getter();
    while(true) {
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            throw new OperationCanceledError();
        }
        if(val !== getter()) {
            return;
        }
        await updatePromise
    }
}


// type ObservableCompleted = 'ObservableCompleted';

// export interface IOperator<S, T> {
//   createObservable(observable: Observable<S>): Observable<T>;
// }

// export abstract class Observable<T> {
//   async next(): Promise<T | ObservableCompleted> {
//     return 'ObservableCompleted';
//   }

//   chain<U>(operator: IOperator<T, U>): Observable<U> {
//     return operator.createObservable(this);
//   }
// }

// export async function subscribe<T>(observable: Observable<T>, callback: (value: T) => void, cancellationToken?: CancellationToken) {
//   while(true){
//     const value = await observable.next();
//     if(value === 'ObservableCompleted') return;
//     if(cancellationToken?.isCancellationRequested) return;
//     callback(value);
//   }
// }


// export class Subject<T> extends Observable<T> {
//   promise: Promise<T>;
//   resolve?: (value: T | PromiseLike<T>) => void;
//   readonly setResolve: (resolve: (value: T | PromiseLike<T>) => void) => void = resolve => this.resolve = resolve;
//   readonly valuesOnFrame: T[] = []

//   constructor() {
//     super();
//     this.promise = new Promise(this.setResolve);
//   }

//   emit(value: T) {
//     // マクロタスクで実行
//     setTimeout(() => {
//       if(!this.resolve) return;
//       this.resolve(value);
//       this.promise = new Promise(this.setResolve);
//     });
//   }
  
//   async setSource(observable: Observable<T>) {
//     if(!this.resolve) return;
//     while(true){
//       const value = await observable.next();
//       if(value === 'ObservableCompleted') return;
//       this.emit(value);
//     }
//   }

//   async next(): Promise<T | 'ObservableCompleted'> {
  
//     const value = await this.promise;
//     return value;
//   }
// }

// class FilterOperator<T> implements IOperator<T, T> {
//   evaluate: (value: T) => boolean;

//   constructor(evaluate: (value: T) => boolean) {
//     this.evaluate = evaluate;
//   }

//   createObservable(observable: Observable<T>): Observable<T> {
//     return new FilterObservable(observable, this.evaluate)
//   }
// }

// export function filter<T>(evaluate: (value: T) => boolean) {
//   return new FilterOperator<T>(evaluate);
// }

// class FilterObservable<T> extends Observable<T> {
//   parent: Observable<T>;
//   evaluate: (value: T) => boolean;

//   constructor(parent: Observable<T>, evaluate: (value: T) => boolean) {
//     super();
//     this.parent = parent;
//     this.evaluate = evaluate;
//   }

//   async next(): Promise<T | ObservableCompleted> {
//     while(true){
//       const value = await this.parent.next();
//       if(value === 'ObservableCompleted') return 'ObservableCompleted';
//       if(this.evaluate(value)) return value;
//     }
//   }
// }

// class MapObservable<S, T> extends Observable<T> {
//   parent: Observable<S>;
//   func: (value: S) => T;

//   constructor(parent: Observable<S>, func: (value: S) => T) {
//     super();
//     this.parent = parent;
//     this.func = func;
//   }
  
//   async next(): Promise<T | ObservableCompleted> {
//     const value = await this.parent.next();
//     if(value === 'ObservableCompleted') return 'ObservableCompleted';
//     return this.func(value);
//   }
// }

// class MapOperator<S, T> implements IOperator<S, T> {
//   func: (value: S) => T;

//   constructor(func: (value: S) => T) {
//     this.func = func;
//   }

//   createObservable(observable: Observable<S>): Observable<T> {
//     return new MapObservable(observable, this.func)
//   }
// }

// export function map<S, T>(func: (value: S) => T) {
//   return new MapOperator<S, T>(func);
// }

// class TakeObservable<T> extends Observable<T> {
//   parent: Observable<T>;
//   takeCount: number;
//   count: number = 0;

//   constructor(parent: Observable<T>, takeCount: number) {
//     super();
//     this.parent = parent;
//     this.takeCount = takeCount;
//   }
  
//   async next(): Promise<T | ObservableCompleted> {
//     if(this.count >= this.takeCount) return 'ObservableCompleted';
//     const value = await this.parent.next();
//     if(value === 'ObservableCompleted') return 'ObservableCompleted';
//     this.count++;
//     return value;
//   }
// }

// class TakeOperator<T> implements IOperator<T, T> {
//   takeCount: number;

//   constructor(takeCount: number) {
//     this.takeCount = takeCount;
//   }

//   createObservable(observable: Observable<T>): Observable<T> {
//     return new TakeObservable(observable, this.takeCount);
//   }
// }

// export function take<T>(takeCount: number) {
//   return new TakeOperator<T>(takeCount);
// }

// class TakeUntilObservable<T> extends Observable<T> {
//   parent: Observable<T>;
//   promise: Promise<'ObservableCompleted'>;

//   constructor(parent: Observable<T>, promise: Promise<any>) {
//     super();
//     this.parent = parent;
//     this.promise = new Promise<'ObservableCompleted'>(resolve => {
//       promise.then(_ => {resolve('ObservableCompleted')});
//     });
//   }
  
//   async next(): Promise<T | ObservableCompleted> {
//     const value = await Promise.any([this.parent.next(), this.promise]);
//     if(value === 'ObservableCompleted') return 'ObservableCompleted';
//     return value;
//   }
// }

// class TakeUntilOperator<T> implements IOperator<T, T> {
//   promise: Promise<any>;

//   constructor(promise: Promise<any>) {
//     this.promise = promise;
//   }

//   createObservable(observable: Observable<T>): Observable<T> {
//     return new TakeUntilObservable(observable, this.promise);
//   }
// }

// export function takeUntil<T>(observable: Observable<any>){
//   return new TakeUntilOperator<T>(observable.next());
// }

// class CompleteOnDestroyObservable<T> extends Observable<T>{
//   parent: Observable<T>;
//   promise: Promise<'ObservableCompleted'>;

//   constructor(parent: Observable<T>, object: Container) {
//     super();
//     this.parent = parent;
//     this.promise = new Promise<'ObservableCompleted'>(resolve => {
//       this.checkDestoryed(object, resolve);
//     });
//   }

//   async checkDestoryed(object: Container, resolve: (value: 'ObservableCompleted' | PromiseLike<'ObservableCompleted'>) => void) {
//     await waitUntil(() => object.destroyed);
//     resolve('ObservableCompleted');
//   }
  
//   async next(): Promise<T | ObservableCompleted> {
//     const value = await Promise.any([this.parent.next(), this.promise]);
//     if(value === 'ObservableCompleted') return 'ObservableCompleted';
//     return value;
//   }
// }

// class CompleteOnDestroyOperator<T> implements IOperator<T, T> {
//   object: Container;

//   constructor(object: Container) {
//     this.object = object;
//   }

//   createObservable(observable: Observable<T>): Observable<T> {
//     return new CompleteOnDestroyObservable(observable, this.object);
//   }
// }

// export function withObject<T>(object: Container) {
//   return new CompleteOnDestroyOperator<T>(object);
// }

// type UnknownProps = Record<string, any>;

// export class TweenObservable<T extends UnknownProps> extends Observable<T> {
//   value: T;
//   tween: Tween<T>
//   isCompleted: boolean = false;

//   constructor(start: T, to: T, duration: number, easing?: (amount: number) => number) {
//     super();
//     this.value = start;
//     this.tween = new Tween(this.value)
//       .to(to, duration)
//       .easing(easing)
//       .onComplete(() => {this.isCompleted = true})
//       .onUpdate((val) => {this.value = val;})
//   }

//   async checkDestoryed(object: Container, resolve: (value: 'ObservableCompleted' | PromiseLike<'ObservableCompleted'>) => void) {
//     await waitUntil(() => object.destroyed);
//     resolve('ObservableCompleted');
//   }
  
//   async next(): Promise<T | ObservableCompleted> {
//     if(!this.tween.isPlaying()) {
//       this.tween.start(time);
//       return this.value;
//     }
//     if(this.isCompleted) return 'ObservableCompleted';
//     await delayFrame(1);
//     this.tween.update(time);
//     return this.value;
//   }
// }