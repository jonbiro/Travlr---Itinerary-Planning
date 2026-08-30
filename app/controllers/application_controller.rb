class ApplicationController < ActionController::API
  before_action :authorized

  JWT_ISSUER = "travlr-legacy-api".freeze
  JWT_AUDIENCE = "travlr-legacy-web".freeze
  JWT_TTL = 1.hour

  def encode_token(payload)
    now = Time.current.to_i
    claims = payload.merge(
      iat: now,
      exp: (Time.current + JWT_TTL).to_i,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE
    )

    JWT.encode(claims, jwt_secret, "HS256")
  end

  def auth_header
    # { Authorization: 'Bearer <token>' }
    request.headers["Authorization"]
  end

  def fallback_index_html
    render :file => 'public/index.html'
  end

  def decoded_token
    return @decoded_token if defined?(@decoded_token)

    token = auth_header.to_s.match(/\ABearer[[:space:]]+([^\s]+)\z/i)&.captures&.first
    return @decoded_token = nil unless token.present?

    @decoded_token = JWT.decode(
      token,
      jwt_secret,
      true,
      algorithm: "HS256",
      iss: JWT_ISSUER,
      verify_iss: true,
      aud: JWT_AUDIENCE,
      verify_aud: true,
      verify_expiration: true
    )
  rescue JWT::DecodeError
    @decoded_token = nil
  end

  def current_user
    return @current_user if defined?(@current_user)

    token = decoded_token
    @current_user = token ? User.find_by(id: token[0]["user_id"]) : nil
  end

  def logged_in?
    !!current_user
  end

  def authorized
    render json: { message: "Please log in" }, status: :unauthorized unless logged_in?
  end

  def jwt_secret
    ENV.fetch("JWT_SECRET")
  end
end
