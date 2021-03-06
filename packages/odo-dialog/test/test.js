/* global describe, it, beforeEach, afterEach */
/* eslint-disable no-unused-expressions */

const { expect } = window.chai;
const {
  sinon, fixture, OdoDialog, OdoDevice, OdoHelpers,
} = window;

fixture.setBase('fixtures');

let clock;

beforeEach(() => {
  clock = sinon.useFakeTimers();

  function fake(el, fn, context) {
    setTimeout(() => {
      const target = el;
      fn.call(context, {
        target,
        currentTarget: target,
      });
    }, 0);
  }

  // Make onTransitionEnd and onAnimationEnd a zero timeout every time.
  sinon.stub(OdoHelpers, 'onTransitionEnd').callsFake(fake);
  sinon.stub(OdoHelpers, 'onAnimationEnd').callsFake(fake);

  sinon.stub(window, 'requestAnimationFrame').callsFake((fn) => {
    fn();
  });
});

afterEach(() => {
  OdoHelpers.onTransitionEnd.restore();
  OdoHelpers.onAnimationEnd.restore();
  window.requestAnimationFrame.restore();
  clock.restore();
});

describe('The OdoDialog Component', () => {
  let fixtureElement;
  let instance;

  // Clone the fixture and append it to the body. Then create a new instance.
  function createFixture(id, options) {
    fixture.load(`${id}.html`);
    fixtureElement = fixture.el.querySelector('.odo-dialog');
    instance = new OdoDialog(fixtureElement, options);
    return instance;
  }

  function removeFixture() {
    if (instance.element) {
      instance.dispose();
      clock.tick(1);
    }

    fixtureElement = null;
    instance = null;
    fixture.cleanup();
  }

  it('will throw an error if it does not receive an element', () => {
    expect(() => {
      new OdoDialog(null); // eslint-disable-line no-new
    }).to.throw(TypeError);
  });

  it('will add and remove to and from the `Instances` array', () => {
    expect(OdoDialog.Instances).to.have.lengthOf(0);

    createFixture('basic');
    const instance2 = new OdoDialog(fixtureElement);
    expect(OdoDialog.Instances).to.have.lengthOf(2);

    instance2.dispose();
    removeFixture();
    expect(OdoDialog.Instances).to.have.lengthOf(0);
  });

  it('will clear all dialog instances', () => {
    createFixture('basic');

    OdoDialog.disposeAll();
    expect(OdoDialog.Instances).to.have.lengthOf(0);
    removeFixture();
  });

  it('will initialize all dialogs', () => {
    const disposeAll = sinon.spy(OdoDialog, 'disposeAll');
    OdoDialog.initializeAll();
    expect(disposeAll.called).to.be.true;
    OdoDialog.disposeAll();
  });

  it('can determine when an element is visible', () => {
    expect(OdoDialog._isVisibleElement({
      offsetWidth: 0,
      offsetHeight: 0,
      getClientRects: () => [],
    })).to.equal(false);

    expect(OdoDialog._isVisibleElement({
      offsetWidth: 0,
      offsetHeight: 1,
      getClientRects: () => [],
    })).to.equal(true);

    expect(OdoDialog._isVisibleElement({
      offsetWidth: 1,
      offsetHeight: 0,
      getClientRects: () => [],
    })).to.equal(true);

    expect(OdoDialog._isVisibleElement({
      offsetWidth: 0,
      offsetHeight: 0,
      getClientRects: () => [{}],
    })).to.equal(true);
  });

  describe('basic dialog', () => {
    beforeEach(() => {
      createFixture('basic');
      OdoDevice.HAS_TRANSITIONS = true;
    });

    afterEach(() => {
      removeFixture();
    });

    it('can be retrieved by id', () => {
      expect(OdoDialog.getDialogById('dialog-basic-fixture')).to.equal(instance);
      expect(OdoDialog.getDialogById('foo')).to.equal(undefined);
      expect(instance.element).to.equal(instance.element);
    });

    it('can determine focusable elements', () => {
      // Has to be open before checkingn for focusable elements so that they're visible.
      instance.open();
      clock.tick(1);
      expect(OdoDialog._getFocusableChildren(instance.element)).to.have.lengthOf(2);
    });

    it('dialog will close when pressing ESC key', () => {
      const hide = sinon.stub(instance, 'close');

      instance.onKeyPress({ which: 27 });
      expect(hide.calledOnce).to.be.true;

      instance.onKeyPress({ which: 13 });
      expect(hide.calledOnce).to.be.true;
      hide.restore();
    });

    it('will trap focus when pressing TAB', () => {
      instance.open(true); // open sync

      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      const tab = {
        shiftKey: false,
        which: 9,
        preventDefault: spy1,
      };

      const shiftTab = {
        shiftKey: true,
        which: 9,
        preventDefault: spy2,
      };

      // There are 2 focusable elements in the basic fixture, an anchor and the
      // close button.
      const anchor = instance.element.querySelector('a');
      const button = instance.element.querySelector('button');

      // set focus because we're faking pressing the tab key, so
      // document.activeElement is not updated.
      instance.element.focus();
      instance.onKeyPress(tab); // focus on anchor
      expect(spy1.callCount).to.equal(0);

      anchor.focus();
      instance.onKeyPress(tab); // focus on close button
      expect(spy1.callCount).to.equal(0);

      button.focus();
      instance.onKeyPress(tab); // trap focus. Should still be on close button.
      expect(spy1.callCount).to.equal(1);

      button.focus();
      instance.onKeyPress(shiftTab); // focus on anchor.
      expect(spy2.callCount).to.equal(0);

      anchor.focus();
      instance.onKeyPress(shiftTab); // trap focus.
      expect(spy2.callCount).to.equal(1);
    });

    it('will emit an event when the trigger is pressed', () => {
      sinon.stub(instance, 'open');
      let called = false;
      const button = document.body.querySelector('.odo-trigger');

      instance.once(OdoDialog.EventType.TRIGGER_CLICKED, (triggerElement) => {
        called = true;
        expect(triggerElement.getAttribute('data-odo-dialog-open')).to.equal('dialog-basic-fixture');
        expect(triggerElement.nodeName).to.equal('BUTTON');
      });

      OdoDialog._handleTriggerClick({
        target: button,
        preventDefault: sinon.spy(),
      });

      expect(called).to.equal(true);
    });

    it('will open a dialog when trigger is pressed', () => {
      const open = sinon.stub(instance, 'open');
      const spy = sinon.spy();

      const button = document.body.querySelector('.odo-trigger');

      OdoDialog._handleTriggerClick({
        target: button,
        preventDefault: spy,
      });

      expect(spy.callCount).to.equal(1);
      expect(open.callCount).to.equal(1);

      OdoDialog._handleTriggerClick({
        target: document.body,
        preventDefault: spy,
      });

      expect(spy.callCount).to.equal(1);
      expect(open.callCount).to.equal(1);
    });

    it('will not try to close if already closed', () => {
      const spy = sinon.spy(instance, '_closed');
      expect(instance.isOpen).to.equal(false);
      instance.close(true);
      expect(spy.callCount).to.equal(0);
    });

    it('will not try to open if already opened', () => {
      const spy = sinon.spy(instance, '_opened');
      expect(instance.isOpen).to.equal(false);
      instance.isOpen = true;
      instance.open(true);
      expect(spy.callCount).to.equal(0);
      instance.isOpen = false;
    });

    it('can close with transition', () => {
      const next = sinon.spy(OdoDialog, '_nextFrame');
      const closed = sinon.spy(instance, '_closed');

      instance.open(true);
      expect(next.callCount).to.equal(0);
      expect(closed.callCount).to.equal(0);
      instance.close();
      expect(next.callCount).to.equal(1);
      expect(closed.callCount).to.equal(0);
      clock.tick(1);
      expect(next.callCount).to.equal(1);
      expect(closed.callCount).to.equal(1);
    });

    it('will not call focus() on the element which had focus before the dialog opened if it does not exist', () => {
      instance.open(true);
      OdoDialog.focusedBeforeDialog = null;
      const fn = () => {
        instance.close(true);
      };

      expect(fn).to.not.throw(Error);
    });

    it('will close the dialog if the main element is clicked', () => {
      const close = sinon.stub(instance, 'close');
      instance.onClick({ target: instance._content });
      expect(close.callCount).to.equal(0);

      instance.onClick({ target: instance.element });
      expect(close.callCount).to.equal(1);

      instance.options.dismissable = false;
      instance.onClick({ target: instance.element });
      expect(close.callCount).to.equal(1);
    });

    it('will set a pixel height on the main element on viewport size change', () => {
      expect(instance.element.style.height).to.equal(window.innerHeight + 'px');
      instance.onResize(100);
      expect(instance.element.style.height).to.equal('100px');
    });

    describe('scrollbar offsets', () => {
      const originalScrollbarWidth = OdoDialog.SCROLLBAR_WIDTH;

      afterEach(() => {
        OdoDialog.SCROLLBAR_WIDTH = originalScrollbarWidth;
      });

      it('zero when there is no scrollbar width', () => {
        OdoDialog.SCROLLBAR_WIDTH = 0;
        expect(instance._getScrollbarOffset()).to.equal(0);
      });

      it('zero when the body and dialog have scrollbars', () => {
        const { element } = instance;
        OdoDialog.SCROLLBAR_WIDTH = 20;
        instance._hasBodyScrollbar = true;
        instance.element = { scrollHeight: Infinity };
        expect(instance._getScrollbarOffset()).to.equal(0);

        instance.element = element;
      });

      it('SCROLLBAR_WIDTH when the body has a scrollbar, but the dialog does not', () => {
        const { element } = instance;

        OdoDialog.SCROLLBAR_WIDTH = 20;
        instance._hasBodyScrollbar = true;
        instance.element = { scrollHeight: 1 };
        expect(instance._getScrollbarOffset()).to.equal(20);

        instance.element = element;
      });

      it('zero when the body does not have a scrollbar', () => {
        OdoDialog.SCROLLBAR_WIDTH = 20;
        instance._hasBodyScrollbar = false;
        expect(instance._getScrollbarOffset()).to.equal(0);
      });

      it('will set `paddingRight` on the main element and body', () => {
        sinon.stub(instance, '_getScrollbarOffset').returns(20);

        OdoDialog.SCROLLBAR_WIDTH = 20;

        instance.open(true);
        expect(instance.element.style.paddingRight).to.equal('20px');
        expect(document.body.style.paddingRight).to.equal('20px');
      });

      it('will not set `paddingRight` on the main element and body when the offset/size is zero', () => {
        sinon.stub(instance, '_getScrollbarOffset').returns(0);

        OdoDialog.SCROLLBAR_WIDTH = 0;

        instance.open(true);
        expect(instance.element.style.paddingRight).to.equal('');
        expect(document.body.style.paddingRight).to.equal('');
      });
    });
  });

  describe('options', () => {
    afterEach(() => {
      removeFixture();
    });

    it('scrollableElement - will use the main element by default', () => {
      createFixture('basic', {});

      const spy = sinon.spy(OdoDialog.ScrollFix, 'add');

      instance._applyScrollFix();
      expect(spy.calledWith(instance.element)).to.equal(true);
      spy.restore();
    });

    it('scrollableElement - can use a selector', () => {
      createFixture('basic', {
        scrollableElement: '.odo-dialog__inner',
      });

      const element = instance.element.querySelector('.odo-dialog__inner');
      const spy = sinon.spy(OdoDialog.ScrollFix, 'add');

      instance._applyScrollFix();
      expect(spy.calledWith(element)).to.equal(true);
      spy.restore();
    });

    it('scrollableElement - can disable scroll fix', () => {
      createFixture('basic', {
        scrollableElement: null,
      });

      const spy = sinon.spy(OdoDialog.ScrollFix, 'add');

      instance._applyScrollFix();
      expect(spy.callCount).to.equal(0);
      spy.restore();
    });
  });

  describe('multiple dialogs', () => {
    let dialog1;
    let dialog2;

    beforeEach(() => {
      dialog1 = createFixture('basic');
      dialog2 = createFixture('modal');
    });

    afterEach(() => {
      dialog1.dispose();
      dialog2.dispose();
      removeFixture();
    });

    it('will increment the z-index of the next dialog when there is already an open dialog and clear it when closed', () => {
      dialog1.open(true);
      expect(OdoDialog.getOpenDialogCount()).to.equal(1);

      dialog2.open(true);
      expect(OdoDialog.getOpenDialogCount()).to.equal(2);

      expect(dialog1.z).to.equal(OdoDialog.Z_BASE);
      expect(dialog2.z).to.equal(OdoDialog.Z_BASE + 20);

      dialog2.close(true);
      expect(OdoDialog.getOpenDialogCount()).to.equal(1);
      expect(dialog2.z).to.equal(OdoDialog.Z_BASE);
    });

    it('will ignore keyboard events when not the top dialog', () => {
      const close1 = sinon.stub(dialog1, 'close');
      const close2 = sinon.stub(dialog2, 'close');
      dialog1.open(true);
      dialog2.open(true);

      dialog1.onKeyPress({ which: 27 });
      expect(close1.calledOnce).to.be.false;

      dialog2.open(true);
      dialog2.onKeyPress({ which: 27 });
      expect(close2.calledOnce).to.be.true;

      close1.restore();
      close2.restore();
    });
  });
});
