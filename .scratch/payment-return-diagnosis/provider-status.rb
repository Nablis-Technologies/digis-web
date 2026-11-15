event = Events::Event.find_by!(slug: "thursday-jazz-sessions")
payment = Orders::Payment.joins(:order).where(orders_orders: {event_id: event.id}).order(created_at: :desc).first
adapter = Payments::Providers::Registry.fetch(payment.provider)
[:provider, :merchant].each do |kind|
  reference = kind == :provider ? payment.provider_reference : payment.provider_merchant_reference
  next if reference.blank?
  result = adapter.verify(provider_reference: reference)
  puts JSON.generate(reference_kind: kind, status: result.status, failure_code: result.failure_code, raw_status: result.raw_status)
end