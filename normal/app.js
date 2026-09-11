const quoteData = [
  ['IC2303.CFE', '中证500股指', '0.00', '0.00', '0.00', '0.00'],
  ['cu2609.SHF', '沪铜2609', '11,404,000.00', '116,000.00', '116,000.00', '109,490.00'],
  ['000001.SZ', '平安银行', '1,022,543,914.24', '11.70', '11.68', '10.53'],
  ['688001.SH', '华兴源创', '751,189,672.00', '66.31', '66.09', '53.05'],
  ['au2702.SHF', '沪黄金2702', '26,239,000.00', '952.08', '959.14', '876.66'],
  ['000981.SZC', '山子高科', '379,265,558.45', '2.71', '2.69', '2.44'],
  ['000981.SZ', '山子高科', '379,265,558.45', '2.71', '2.69', '2.44'],
  ['000002.SZC', '万科A', '319,828,012.91', '3.19', '3.18', '2.87'],
  ['000002.SZ', '万科A', '319,828,012.91', '3.19', '3.18', '2.87'],
  ['000001.SZC', '平安银行', '1,022,543,914.24', '11.70', '11.68', '10.53'],
];

const marketTypes = {
  SH: [
    ['five-ioc', '最优五档即时成交剩余撤销'],
    ['five-limit', '最优五档即时成交剩余转限价'],
    ['own-best', '本方最优价格'],
    ['counterparty', '对手方最优价格'],
  ],
  SZ: [
    ['counterparty', '对手方最优价格'],
    ['own-best', '本方最优价格'],
    ['five-ioc', '最优五档即时成交剩余撤销'],
    ['ioc', '即时成交剩余撤销（IOC）'],
    ['fok', '全额成交或撤销（FOK）'],
  ],
  BJ: [
    ['counterparty', '对手方最优价格'],
    ['own-best', '本方最优价格'],
    ['five-ioc', '最优五档即时成交剩余撤销'],
    ['five-limit', '最优五档即时成交剩余转限价'],
  ],
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function toast(message, type = 'error') {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', type === 'error');
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderQuotes() {
  $('#quote-rows').innerHTML = quoteData.map((row, index) => `
    <tr data-code="${row[0]}" data-name="${row[1]}">
      <td>${index + 1}</td><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td>
    </tr>`).join('');
}

function renderDepth() {
  const buys = [['11.84', '128'], ['11.83', '1648'], ['11.82', '1782'], ['11.81', '1103'], ['11.80', '3429']];
  const sells = [['11.85', '1371'], ['11.86', '8386'], ['11.87', '2216'], ['11.88', '4716'], ['11.89', '9045']];
  const rows = values => values.map((value, index) => `<div class="depth-row"><i>${index + 1}</i><b>${value[0]}</b><span>${value[1]}</span></div>`).join('');
  $('#buy-depth').innerHTML = rows(buys);
  $('#sell-depth').innerHTML = rows(sells);
}

function securityMarket(code) {
  const suffix = code.split('.')[1];
  if (suffix === 'SH') return 'SH';
  if (suffix === 'SZ') return 'SZ';
  if (suffix === 'BJ') return 'BJ';
  return '';
}

function updateMarketTypes() {
  const select = $('#market-type');
  const types = marketTypes[securityMarket($('#security').value)];
  const previous = select.value;
  select.innerHTML = '<option value="">请选择市价类型</option>' + (types || [])
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
  if (types?.some(([value]) => value === previous)) select.value = previous;
}

function updateAmount() {
  if ($('#order-type').value === 'market') {
    $('#amount').value = '';
    return;
  }
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  $('#amount').value = quantity > 0 && price > 0
    ? `${(quantity * price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CNY`
    : '-';
}

function updateOrderType() {
  const isMarket = $('#order-type').value === 'market';
  $('#market-type-field').classList.toggle('hidden', !isMarket);
  $('#amount-row').classList.add('hidden');
  $('#price-label').textContent = isMarket ? '保护限价' : '订单价格';
  $('#price-caption').innerHTML = isMarket ? '买入最高价 / 卖出最低价' : '等于当前价 <span>0.00%</span>';
  if (isMarket) updateMarketTypes();
  updateAmount();
}

function setSecurityError(hasError) {
  const security = $('#security');
  security.classList.toggle('field-error', hasError);
  security.setAttribute('aria-invalid', hasError ? 'true' : 'false');
}

function guardMarketType(event) {
  if ($('#security').value) {
    setSecurityError(false);
    return;
  }
  event.preventDefault();
  setSecurityError(true);
}

function setSide(side) {
  $$('.side-switch button').forEach(button => button.classList.toggle('active', button.dataset.side === side));
  const submit = $('#place-order');
  submit.textContent = side === 'buy' ? '买入' : '卖出';
  submit.className = `place-order ${side}`;
  submit.dataset.side = side;
}

function placeOrder() {
  const security = $('#security').value;
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  const isMarket = $('#order-type').value === 'market';
  if (!security) {
    setSecurityError(true);
    return;
  }
  setSecurityError(false);
  if (isMarket && !$('#market-type').value) return toast('请选择市价类型');
  if (price <= 0) return toast(isMarket ? '请输入有效保护限价' : '请输入有效订单价格');
  if (quantity <= 0) return toast('请输入有效委托数量');
  const side = $('#place-order').dataset.side === 'sell' ? '卖出' : '买入';
  toast(`${side}委托已提交（演示）`, 'info');
}

renderQuotes();
renderDepth();
setSide('buy');
updateOrderType();

$$('.nav-item').forEach(button => button.addEventListener('click', () => {
  $$('.nav-item').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$$('.top-tab').forEach(button => button.addEventListener('click', () => {
  $$('.top-tab').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$$('.group-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.group-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$('#quote-rows').addEventListener('click', event => {
  const row = event.target.closest('tr');
  if (!row) return;
  $$('#quote-rows tr').forEach(item => item.classList.remove('selected'));
  row.classList.add('selected');
  $('#quote-code').textContent = row.dataset.code;
  $('#quote-name').textContent = row.dataset.name;
});

$$('.trade-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.trade-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$$('.side-switch button').forEach(button => button.addEventListener('click', () => setSide(button.dataset.side)));

$$('.stepper button').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.target);
  button.dataset.dir === 'up' ? input.stepUp() : input.stepDown();
  updateAmount();
}));

$$('.fraction-row button').forEach(button => button.addEventListener('click', () => {
  const raw = 500 * Number(button.dataset.ratio);
  $('#quantity').value = Math.max(100, Math.floor(raw / 100) * 100);
  updateAmount();
}));

$('#order-type').addEventListener('change', updateOrderType);
$('#security').addEventListener('change', () => {
  if ($('#security').value) setSecurityError(false);
  if ($('#order-type').value === 'market') updateMarketTypes();
});
$('#market-type').addEventListener('pointerdown', guardMarketType);
$('#market-type').addEventListener('keydown', event => {
  if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) guardMarketType(event);
});
$('#price').addEventListener('input', updateAmount);
$('#quantity').addEventListener('input', updateAmount);
$('#place-order').addEventListener('click', placeOrder);
