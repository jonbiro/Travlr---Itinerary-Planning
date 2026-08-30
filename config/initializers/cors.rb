# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin AJAX requests.

# Read more: https://github.com/cyu/rack-cors

configured_origins = ENV.fetch("CORS_ORIGINS", "").split(",").map(&:strip).reject(&:empty?)
default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
allowed_origins = if configured_origins.any?
                    configured_origins.reject { |origin| origin == "*" }
                  elsif Rails.env.production?
                    []
                  else
                    default_origins
                  end

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  if allowed_origins.any?
    allow do
      origins(*allowed_origins)

      resource '*',
        headers: ["Authorization", "Content-Type", "Accept", "Origin"],
        methods: [:get, :post, :put, :patch, :delete, :options, :head]
    end
  end
end
