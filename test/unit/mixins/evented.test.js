/* eslint-env qunit */
import sinon from 'sinon';
import evented from '../../../src/js/mixins/evented';
import * as Dom from '../../../src/js/utils/dom';
import * as Obj from '../../../src/js/utils/obj';

// Common errors thrown by evented objects.
const errors = {
  type: new Error('invalid event type; must be a non-empty string or array'),
  listener: new Error('invalid listener; must be a function'),
  target: new Error('invalid target; must be a DOM node or evented object')
};

QUnit.module('mixins: evented', {

  beforeEach() {
    this.targets = {};
  },

  afterEach() {
    Object.keys(this.targets).forEach(k => this.targets[k].trigger('dispose'));
  }
});

QUnit.test('evented() mutates an object as expected', function(assert) {
  const target = this.targets.a = {};

  assert.strictEqual(typeof evented, 'function', 'the mixin is a function');
  assert.strictEqual(evented(target), target, 'returns the target object');

  assert.ok(Obj.isObject(target), 'the target is still an object');
  assert.ok(Dom.isEl(target.eventBusEl_), 'the target has an event bus element');
  assert.strictEqual(typeof target.off, 'function', 'the target has an off method');
  assert.strictEqual(typeof target.on, 'function', 'the target has an on method');
  assert.strictEqual(typeof target.one, 'function', 'the target has a one method');
  assert.strictEqual(typeof target.trigger, 'function', 'the target has a trigger method');
});

QUnit.test('evented() with custom element', function(assert) {
  const target = this.targets.a = evented({foo: Dom.createEl('span')}, {eventBusKey: 'foo'});

  assert.strictEqual(target.eventBusEl_, target.foo, 'the custom DOM element is re-used');

  assert.throws(
    () => evented({foo: {}}, {eventBusKey: 'foo'}),
    new Error('eventBusKey "foo" does not refer to an element'),
    'throws if the target does not have an element at the supplied key'
  );
});

QUnit.test('on() and one() errors', function(assert) {
  const target = this.targets.a = evented({});

  ['on', 'one'].forEach(method => {
    assert.throws(() => target[method](), errors.type);
    assert.throws(() => target[method]('   '), errors.type);
    assert.throws(() => target[method]([]), errors.type);
    assert.throws(() => target[method]('x'), errors.listener);
    assert.throws(() => target[method]({}, 'x', () => {}), errors.target);
    assert.throws(() => target[method](evented({}), 'x', null), errors.listener);
  });
});

QUnit.test('off() errors', function(assert) {
  const target = this.targets.a = evented({});

  // An invalid event actually causes an invalid target error because it
  // gets passed into code that assumes the first argument is the target.
  assert.throws(() => target.off([]), errors.target);
  assert.throws(() => target.off({}, 'x', () => {}), errors.target);
  assert.throws(() => target.off(evented({}), '', () => {}), errors.type);
  assert.throws(() => target.off(evented({}), [], () => {}), errors.type);
  assert.throws(() => target.off(evented({}), 'x', null), errors.listener);
});

QUnit.test('on() can add a listener to one event type on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spy = sinon.spy();

  a.on('x', spy);
  a.trigger('x');

  assert.strictEqual(spy.callCount, 1);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, a.eventBusEl_);
});

QUnit.test('on() can add a listener to an array of event types on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spy = sinon.spy();

  a.on(['x', 'y'], spy);
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spy.callCount, 2);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, a.eventBusEl_);
  assert.strictEqual(spy.getCall(1).thisValue, a);
  assert.strictEqual(spy.getCall(1).args[0].type, 'y');
  assert.strictEqual(spy.getCall(1).args[0].target, a.eventBusEl_);
});

QUnit.test('one() can add a listener to one event type on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spy = sinon.spy();

  a.one('x', spy);
  a.trigger('x');
  a.trigger('x');

  assert.strictEqual(spy.callCount, 1);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, a.eventBusEl_);
});

QUnit.test('one() can add a listener to an array of event types on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spy = sinon.spy();

  a.one(['x', 'y'], spy);
  a.trigger('x');
  a.trigger('y');
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spy.callCount, 2);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, a.eventBusEl_);
  assert.strictEqual(spy.getCall(1).thisValue, a);
  assert.strictEqual(spy.getCall(1).args[0].type, 'y');
  assert.strictEqual(spy.getCall(1).args[0].target, a.eventBusEl_);
});

QUnit.test('on() can add a listener to one event type on a different target object', function(assert) {
  const a = this.targets.a = evented({});
  const b = this.targets.b = evented({});
  const spy = sinon.spy();

  a.on(b, 'x', spy);
  b.trigger('x');

  // Make sure we aren't magically binding a listener to "a".
  a.trigger('x');

  assert.strictEqual(spy.callCount, 1);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, b.eventBusEl_);
});

QUnit.test('on() can add a listener to an array of event types on a different target object', function(assert) {
  const a = this.targets.a = evented({});
  const b = this.targets.b = evented({});
  const spy = sinon.spy();

  a.on(b, ['x', 'y'], spy);
  b.trigger('x');
  b.trigger('y');

  // Make sure we aren't magically binding a listener to "a".
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spy.callCount, 2);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, b.eventBusEl_);
  assert.strictEqual(spy.getCall(1).thisValue, a);
  assert.strictEqual(spy.getCall(1).args[0].type, 'y');
  assert.strictEqual(spy.getCall(1).args[0].target, b.eventBusEl_);
});

QUnit.test('one() can add a listener to one event type on a different target object', function(assert) {
  const a = this.targets.a = evented({});
  const b = this.targets.b = evented({});
  const spy = sinon.spy();

  a.one(b, 'x', spy);
  b.trigger('x');

  // Make sure we aren't magically binding a listener to "a".
  a.trigger('x');

  assert.strictEqual(spy.callCount, 1);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, b.eventBusEl_);
});

// The behavior here unfortunately differs from the identical case where "a"
// listens to itself. This is something that should be resolved...
QUnit.test('one() can add a listener to an array of event types on a different target object', function(assert) {
  const a = this.targets.a = evented({});
  const b = this.targets.b = evented({});
  const spy = sinon.spy();

  a.one(b, ['x', 'y'], spy);
  b.trigger('x');
  b.trigger('y');
  b.trigger('x');
  b.trigger('y');

  // Make sure we aren't magically binding a listener to "a".
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spy.callCount, 1);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, b.eventBusEl_);
});

QUnit.test('off() with no arguments will remove all listeners from all events on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spyX = sinon.spy();
  const spyY = sinon.spy();

  a.on('x', spyX);
  a.on('y', spyY);
  a.trigger('x');
  a.trigger('y');
  a.off();
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spyX.callCount, 1);
  assert.strictEqual(spyX.getCall(0).thisValue, a);
  assert.strictEqual(spyX.getCall(0).args[0].type, 'x');
  assert.strictEqual(spyX.getCall(0).args[0].target, a.eventBusEl_);

  assert.strictEqual(spyY.callCount, 1);
  assert.strictEqual(spyY.getCall(0).thisValue, a);
  assert.strictEqual(spyY.getCall(0).args[0].type, 'y');
  assert.strictEqual(spyY.getCall(0).args[0].target, a.eventBusEl_);
});

QUnit.test('off() can remove all listeners from a single event on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spyX = sinon.spy();
  const spyY = sinon.spy();

  a.on('x', spyX);
  a.on('y', spyY);
  a.trigger('x');
  a.trigger('y');
  a.off('x');
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spyX.callCount, 1);
  assert.strictEqual(spyX.getCall(0).thisValue, a);
  assert.strictEqual(spyX.getCall(0).args[0].type, 'x');
  assert.strictEqual(spyX.getCall(0).args[0].target, a.eventBusEl_);

  assert.strictEqual(spyY.callCount, 2);
  assert.strictEqual(spyY.getCall(0).thisValue, a);
  assert.strictEqual(spyY.getCall(0).args[0].type, 'y');
  assert.strictEqual(spyY.getCall(0).args[0].target, a.eventBusEl_);
  assert.strictEqual(spyY.getCall(1).thisValue, a);
  assert.strictEqual(spyY.getCall(1).args[0].type, 'y');
  assert.strictEqual(spyY.getCall(1).args[0].target, a.eventBusEl_);
});

QUnit.test('off() can remove a listener from a single event on this object', function(assert) {
  const a = this.targets.a = evented({});
  const spyX1 = sinon.spy();
  const spyX2 = sinon.spy();
  const spyY = sinon.spy();

  a.on('x', spyX1);
  a.on('x', spyX2);
  a.on('y', spyY);
  a.trigger('x');
  a.trigger('y');
  a.off('x', spyX1);
  a.trigger('x');
  a.trigger('y');

  assert.strictEqual(spyX1.callCount, 1);
  assert.strictEqual(spyX1.getCall(0).thisValue, a);
  assert.strictEqual(spyX1.getCall(0).args[0].type, 'x');
  assert.strictEqual(spyX1.getCall(0).args[0].target, a.eventBusEl_);

  assert.strictEqual(spyX2.callCount, 2);
  assert.strictEqual(spyX2.getCall(0).thisValue, a);
  assert.strictEqual(spyX2.getCall(0).args[0].type, 'x');
  assert.strictEqual(spyX2.getCall(0).args[0].target, a.eventBusEl_);
  assert.strictEqual(spyX2.getCall(1).thisValue, a);
  assert.strictEqual(spyX2.getCall(1).args[0].type, 'x');
  assert.strictEqual(spyX2.getCall(1).args[0].target, a.eventBusEl_);

  assert.strictEqual(spyY.callCount, 2);
  assert.strictEqual(spyY.getCall(0).thisValue, a);
  assert.strictEqual(spyY.getCall(0).args[0].type, 'y');
  assert.strictEqual(spyY.getCall(0).args[0].target, a.eventBusEl_);
  assert.strictEqual(spyY.getCall(1).thisValue, a);
  assert.strictEqual(spyY.getCall(1).args[0].type, 'y');
  assert.strictEqual(spyY.getCall(1).args[0].target, a.eventBusEl_);
});

QUnit.test('off() can remove a listener from a single event on a different target object', function(assert) {
  const a = this.targets.a = evented({});
  const b = this.targets.b = evented({});
  const spy = sinon.spy();

  a.on(b, 'x', spy);
  b.trigger('x');
  a.off(b, 'x', spy);
  b.trigger('x');

  assert.strictEqual(spy.callCount, 1);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, b.eventBusEl_);
});

QUnit.test('off() can remove a listener from an array of events on a different target object', function(assert) {
  const a = this.targets.a = evented({});
  const b = this.targets.b = evented({});
  const spy = sinon.spy();

  a.on(b, ['x', 'y'], spy);
  b.trigger('x');
  b.trigger('y');
  a.off(b, ['x', 'y'], spy);
  b.trigger('x');
  b.trigger('y');

  assert.strictEqual(spy.callCount, 2);
  assert.strictEqual(spy.getCall(0).thisValue, a);
  assert.strictEqual(spy.getCall(0).args[0].type, 'x');
  assert.strictEqual(spy.getCall(0).args[0].target, b.eventBusEl_);
  assert.strictEqual(spy.getCall(1).thisValue, a);
  assert.strictEqual(spy.getCall(1).args[0].type, 'y');
  assert.strictEqual(spy.getCall(1).args[0].target, b.eventBusEl_);
});
