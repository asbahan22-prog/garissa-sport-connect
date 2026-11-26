import { useEffect, useState } from 'react';
import api, { errorMessage } from './api';

export function useRemote(url) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!url) {
      setState({ loading: false, data: null, error: '' });
      return undefined;
    }
    let cancel = false;
    setState((current) => ({ ...current, loading: true, error: '' }));
    api.get(url)
      .then((res) => { if (!cancel) setState({ loading: false, data: res.data.data, error: '' }); })
      .catch((err) => { if (!cancel) setState({ loading: false, data: null, error: errorMessage(err) }); });
    return () => { cancel = true; };
  }, [url, version]);
  return { ...state, reload: () => setVersion((value) => value + 1) };
}
