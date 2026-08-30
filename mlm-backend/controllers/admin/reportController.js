    const emiLabel = (n) => {
      if (n === 0) return 'Booking Amount';
      if (n === -1) return 'Down Payment';
      if (n < -1) return `Down Payment ${Math.abs(n)}`;
      if (n === 99) return 'Registry';
      if (n > 0) return `EMI Month ${n}`;
      return `Step ${n}`;
    };