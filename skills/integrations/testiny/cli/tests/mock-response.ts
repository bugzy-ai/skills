export function mockOk(data: unknown) {
  const json = JSON.stringify(data);
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(json),
  };
}

export function mockEmpty() {
  return {
    ok: true,
    status: 200,
    json: () => Promise.reject(new Error('no body')),
    text: () => Promise.resolve(''),
  };
}
