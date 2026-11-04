begin
require "digest"
config = File.readlines("/rails/.env.chapa").each_with_object({}) do |line, values|
  k,v=line.strip.split("=",2); values[k]=v.to_s.strip.delete_prefix('"').delete_suffix('"').delete_prefix("'").delete_suffix("'") if k && v
end
safe_keys = %w[CHAPA_SECRET_KEY CHAPA_WEBHOOK_SECRET CHAPA_MODE CHAPA_API_BASE_URL CHAPA_CALLBACK_URL CHAPA_RETURN_URL CHAPA_ENABLED]
puts JSON.generate(runtime_config_matches_file: safe_keys.to_h {|key| [key, ENV[key].to_s == config[key].to_s]}, mode: ENV["CHAPA_MODE"], queue_adapter: Rails.application.config.active_job.queue_adapter)
files=%w[app/services/payments/providers/chapa_client.rb app/services/orders/process_payment_event.rb app/services/orders/payment_refresh.rb app/services/orders/start_payment_attempt.rb]
puts JSON.generate(code_hashes: files.to_h {|f| [f,Digest::SHA256.file("/rails/#{f}").hexdigest]})
recent = Orders::Payment.where.not(accepted_at: nil).order(accepted_at: :desc).limit(6).map do |p|
 {id: p.id, accepted_at: p.accepted_at, created_at: p.created_at, order_status: p.order&.status, provider: p.provider, provider_reference_present: p.provider_reference.present?, event_types: p.payment_events.pluck(:event_type), ticket_count: p.order ? Ticketing::Ticket.where(order_item_id: p.order.order_items.select(:id)).count : 0}
end
puts JSON.generate(last_accepted_payments: recent, recent_webhooks: Orders::PaymentEvent.where("received_at > ?", 3.hours.ago).group(:event_type,:status).count.map {|k,v| {event_type:k[0],status:k[1],count:v}})
event = Orders::PaymentEvent.find_by(provider_event_id: "HCCePSUoB7pn")
if event
 puts JSON.generate(latest_event: {status:event.status, attempts:event.attempts_count, last_error_present:event.last_error.present?, payload_keys:event.payload.keys, received_at:event.received_at,processed_at:event.processed_at}, dispatches: Core::OutboxEvent.where(aggregate_id: event.id).map {|e| e.slice("event_type","published_at","attempts")})
end
rescue StandardError=>e
 puts JSON.generate(diagnostic_error_class:e.class.name)
end